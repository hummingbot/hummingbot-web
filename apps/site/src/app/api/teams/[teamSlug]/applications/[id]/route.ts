import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireTeamMember,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"
import { ApplicationStatus } from "@prisma/client"
import { sendApplicationStatusEmail, sendTeamOutrankedEmail } from "@/botcamp/lib/notifications"
import { isSelectionOpen, selectionClosedReason } from "@/botcamp/lib/hackathon-stages"
import { teamCanReviewApplication } from "@/botcamp/lib/team-admin"

interface RouteParams {
  params: Promise<{ teamSlug: string; id: string }>
}

// Thrown inside the selection transaction to surface a specific, user-facing
// message instead of falling through to the generic 500 handler.
class SelectionError extends Error {}

// A team's own note on an application. Each ranked team has its own row; the
// legacy shared `Application.teamNote` column is omitted from every read here,
// since it holds whichever team wrote last.
async function readTeamNote(applicationId: string, teamId: string): Promise<string | null> {
  const row = await prisma.applicationTeamNote.findUnique({
    where: { applicationId_teamId: { applicationId, teamId } },
    select: { note: true },
  })
  return row?.note ?? null
}

async function saveTeamNote(applicationId: string, teamId: string, note: string | null): Promise<void> {
  const text = note?.trim()
  if (!text) {
    await prisma.applicationTeamNote.deleteMany({ where: { applicationId, teamId } })
    return
  }
  await prisma.applicationTeamNote.upsert({
    where: { applicationId_teamId: { applicationId, teamId } },
    create: { applicationId, teamId, note: text },
    update: { note: text },
  })
}

const applicationInclude = {
  user: {
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      slug: true,
    },
  },
  strategy: {
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      strategyType: true,
      status: true,
    },
  },
  hackathon: {
    select: {
      id: true,
      slug: true,
      title: true,
      maxSelections: true,
    },
  },
  selectedTeam: {
    select: {
      id: true,
      slug: true,
      name: true,
    },
  },
} as const

// GET /api/teams/[teamSlug]/applications/[id] - Get full application detail
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { teamSlug, id } = await params

    // Look up team by slug
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      select: { id: true, name: true },
    })

    if (!team) {
      return notFoundResponse("Team not found")
    }

    // Check team membership
    const session = await requireTeamMember(team.id)
    if (!session) {
      return unauthorizedResponse()
    }

    // Fetch application with full details
    const application = await prisma.application.findUnique({
      where: { id },
      omit: { teamNote: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            slug: true,
            tagline: true,
            about: true,
            linkedin: true,
            github: true,
            discord: true,
            websiteUrl: true,
            walletNetwork: true,
            walletAddress: true,
          },
        },
        strategy: {
          select: {
            id: true,
            slug: true,
            title: true,
            summary: true,
            details: true,
            strategyType: true,
            status: true,
            tags: true,
            exchanges: true,
            videoURL: true,
            createdAt: true,
            updatedAt: true,
            files: {
              select: {
                id: true,
                filename: true,
                type: true,
                mimeType: true,
                size: true,
                url: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        hackathon: {
          select: {
            id: true,
            slug: true,
            title: true,
            maxSelections: true,
            status: true,
          },
        },
        selectedTeam: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    })

    if (!application) {
      return notFoundResponse("Application not found")
    }

    // Submitted and ranking this team, or selected by it — not a draft
    if (!teamCanReviewApplication(application, team.id)) {
      return notFoundResponse("Application not found")
    }
    const isSelectedByTeam = application.selectedTeamId === team.id

    return successResponse({
      ...application,
      teamNote: await readTeamNote(application.id, team.id),
      preferenceRank: application.teamPreferences.indexOf(team.id) + 1,
      isSelectedByThisTeam: isSelectedByTeam,
      team,
    })
  } catch (error) {
    console.error("Error fetching application:", error)
    return serverErrorResponse("Failed to fetch application")
  }
}

// PUT /api/teams/[teamSlug]/applications/[id] - Select/deselect or add note
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamSlug, id } = await params

    // Look up team by slug
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      select: { id: true, name: true },
    })

    if (!team) {
      return notFoundResponse("Team not found")
    }

    // Check team membership
    const session = await requireTeamMember(team.id)
    if (!session) {
      return unauthorizedResponse()
    }

    // Parse request body. A team never sets an application's status directly:
    // selecting and deselecting set it. A free-form status let any team the
    // applicant ranked push it back to DRAFT at any stage, even one another
    // team had selected, which takes the entry out of the race (security
    // review of 2026-10-31).
    const body = await parseBody<{
      select?: boolean  // true to select, false to deselect
      teamNote?: string | null
    }>(request)

    if (!body) {
      return badRequestResponse("Invalid request body")
    }
    if (body.teamNote !== undefined && body.teamNote !== null && typeof body.teamNote !== "string") {
      return badRequestResponse("teamNote must be a string")
    }

    // Fetch existing application
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        hackathon: {
          select: {
            id: true,
            status: true,
            maxSelections: true,
          },
        },
      },
    })

    if (!application) {
      return notFoundResponse("Application not found")
    }

    // Submitted and ranking this team, or selected by it. A draft is still
    // the builder's: selecting one locked them out of editing it.
    if (!teamCanReviewApplication(application, team.id)) {
      return notFoundResponse("Application not found")
    }

    let updatedApplication
    let outrankedTeamId: string | null = null

    // The stage gates both selecting and deselecting: teams pick during Open,
    // and rosters are final from the Countdown on — a later change would split
    // the roster from the agents already on the starting grid.
    if ((body.select === true || body.select === false) && !isSelectionOpen(application.hackathon)) {
      return badRequestResponse(selectionClosedReason(application.hackathon.status))
    }

    if (body.select === true) {
      // Selecting this application for the team. The read-check-write below
      // is wrapped in a transaction serialized by Postgres advisory locks:
      // one scoped to this team, so two concurrent "Select" clicks (e.g. two
      // team members at once) can't both read the same under-the-limit
      // count and both write, exceeding maxSelections; and one scoped to the
      // application, so two teams selecting it at once can't both read "no
      // seat holder" and leave it with whichever wrote last — maybe the team
      // the builder ranked lower. Always team first, then application, so the
      // locks can't deadlock.
      try {
        updatedApplication = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('team-select'), hashtext(${team.id}))`
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('application-select'), hashtext(${id}))`

          // Re-read inside the lock — another request may have changed
          // selectedTeamId while this one was waiting for the lock.
          const fresh = await tx.application.findUnique({
            where: { id },
            select: { selectedTeamId: true, teamPreferences: true, hackathonId: true, status: true },
          })
          if (!fresh) {
            throw new SelectionError("Application not found")
          }
          if (fresh.status === "DRAFT") {
            throw new SelectionError("This application is still a draft — it can be selected once it's submitted")
          }

          if (fresh.selectedTeamId && fresh.selectedTeamId !== team.id) {
            // Another team already holds this seat — the applicant's own
            // ranked team preferences break the tie. Whichever team they
            // ranked higher (lower index in teamPreferences) gets the seat,
            // regardless of which team clicked "Select" first.
            const currentRank = fresh.teamPreferences.indexOf(fresh.selectedTeamId)
            const newRank = fresh.teamPreferences.indexOf(team.id)
            const newTeamIsPreferred = newRank !== -1 && (currentRank === -1 || newRank < currentRank)

            if (!newTeamIsPreferred) {
              throw new SelectionError(
                "This application has already been selected by a team the applicant ranked higher"
              )
            }
            // Otherwise fall through — this team outranks the current
            // holder, so it takes over the seat below.
            outrankedTeamId = fresh.selectedTeamId
          }

          const currentSelectedCount = await tx.application.count({
            where: {
              hackathonId: fresh.hackathonId,
              selectedTeamId: team.id,
              id: { not: id },
            },
          })

          if (currentSelectedCount >= application.hackathon.maxSelections) {
            throw new SelectionError(
              `Cannot select more applications. Maximum of ${application.hackathon.maxSelections} selections allowed.`
            )
          }

          return tx.application.update({
            where: { id },
            data: {
              selectedTeamId: team.id,
              status: "REVIEWED",
            },
            omit: { teamNote: true },
            include: applicationInclude,
          })
        })
      } catch (err) {
        if (err instanceof SelectionError) {
          return badRequestResponse(err.message)
        }
        throw err
      }
    } else {
      const updateData: {
        status?: ApplicationStatus
        selectedTeamId?: string | null
      } = {}

      if (body.select === false) {
        // Deselecting - only if this team selected it
        if (application.selectedTeamId === team.id) {
          updateData.selectedTeamId = null
          updateData.status = "FINALIZED"
        }
      }

      updatedApplication = await prisma.application.update({
        where: { id },
        data: updateData,
        omit: { teamNote: true },
        include: applicationInclude,
      })
    }

    if (body.teamNote !== undefined) {
      await saveTeamNote(id, team.id, body.teamNote)
    }

    // Notify the applicant when a team action changed their status. Not on a
    // deselect: that reverts to FINALIZED, whose email ("submitted for team
    // review. Good luck!") would misread a seat being given up.
    if (updatedApplication.status !== application.status && body.select !== false) {
      await sendApplicationStatusEmail(id, updatedApplication.status).catch((err) =>
        console.error("Failed to send application status email:", err)
      )
    }

    // Notify the team that just lost this applicant to a team the applicant
    // ranked higher — otherwise they'd only find out by noticing the
    // applicant missing from their dashboard.
    if (outrankedTeamId) {
      await sendTeamOutrankedEmail(id, outrankedTeamId).catch((err) =>
        console.error("Failed to send team outranked email:", err)
      )
    }

    return successResponse({
      ...updatedApplication,
      teamNote: await readTeamNote(id, team.id),
      preferenceRank: updatedApplication.teamPreferences.indexOf(team.id) + 1,
      isSelectedByThisTeam: updatedApplication.selectedTeamId === team.id,
    })
  } catch (error) {
    console.error("Error updating application:", error)
    return serverErrorResponse("Failed to update application")
  }
}
