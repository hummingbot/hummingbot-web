import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { APPLICANT_OMIT } from "@/botcamp/lib/applicant-view"
import { isRegistrationOpen } from "@/botcamp/lib/hackathon-stages"
import {
  requireAuth,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  conflictResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"
import { ApplicationStatus } from "@prisma/client"
import { sendApplicationStatusEmail } from "@/botcamp/lib/notifications"
import { raceDataBlocksDelete } from "@/botcamp/lib/race-data-guard"
import { BOTCAMP_SLUG, validateTeamPreferences } from "@/botcamp/lib/hackathon-squads"

interface RouteParams {
  params: Promise<{ slug: string; id: string }>
}

// GET /api/hackathons/[slug]/applications/[id] - Get a specific application
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!session) {
      return unauthorizedResponse()
    }

    const { slug, id } = await params

    // Get hackathon to verify slug
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true, teamIds: true },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    // Get application
    const application = await prisma.application.findUnique({
      where: { id },
      omit: APPLICANT_OMIT,
      include: {
        strategy: {
          select: {
            id: true,
            slug: true,
            title: true,
            summary: true,
            strategyType: true,
            tags: true,
            exchanges: true,
          },
        },
        user: {
          select: {
            id: true,
            slug: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        selectedTeam: {
          select: {
            id: true,
            slug: true,
            name: true,
                        logoUrl: true,
          },
        },
      },
    })

    if (!application) {
      return notFoundResponse("Application not found")
    }

    // Verify application belongs to this hackathon
    if (application.hackathonId !== hackathon.id) {
      return notFoundResponse("Application not found in this hackathon")
    }

    // Check authorization: user is owner or admin
    const isOwner = application.userId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isOwner && !isAdmin) {
      return unauthorizedResponse()
    }

    // Get teams for this hackathon to resolve team preferences
    const teams = await prisma.team.findMany({
      where: { id: { in: hackathon.teamIds } },
      select: { id: true, slug: true, name: true, logoUrl: true },
    })

    return successResponse({
      ...application,
      teams,
    })
  } catch (error) {
    console.error("Error fetching application:", error)
    return serverErrorResponse("Failed to fetch application")
  }
}

// PUT /api/hackathons/[slug]/applications/[id] - Update an application
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!session) {
      return unauthorizedResponse()
    }

    const { slug, id } = await params
    const body = await parseBody<{
      status?: ApplicationStatus
      strategyId?: number
      teamPreferences?: string[]
      selectedTeamId?: string | null
      adminNote?: string | null
    }>(request)

    if (!body) {
      return badRequestResponse("Invalid request body")
    }

    // Get hackathon to verify slug
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        teamIds: true,
        registrationEnd: true,
      },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    // Get application
    const application = await prisma.application.findUnique({
      where: { id },
    })

    if (!application) {
      return notFoundResponse("Application not found")
    }

    // Verify application belongs to this hackathon
    if (application.hackathonId !== hackathon.id) {
      return notFoundResponse("Application not found in this hackathon")
    }

    const isOwner = application.userId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isOwner && !isAdmin) {
      return unauthorizedResponse("You are not authorized to update this application")
    }

    // Owner edits are only allowed while the hackathon is in REGISTRATION and
    // the submission deadline hasn't passed. Admins are exempt below.
    const applicationsOpen = isRegistrationOpen(hackathon)

    if (isOwner && !isAdmin && !applicationsOpen) {
      return badRequestResponse("Applications are not open for this hackathon")
    }

    // Resolved once here: both the owner and admin branches below run the same
    // validateTeamPreferences check, which needs Botcamp's team id.
    const botcampTeam = await prisma.team.findUnique({
      where: { slug: BOTCAMP_SLUG },
      select: { id: true },
    })

    // Build update data
    const updateData: {
      status?: ApplicationStatus
      strategyId?: number | null
      teamPreferences?: string[]
      selectedTeamId?: string | null
      adminNote?: string | null
    } = {}

    // Owner can update draft/finalized applications while applications are open.
    // Once the hackathon leaves REGISTRATION, only admins can change applications.
    if (
      isOwner &&
      applicationsOpen &&
      (application.status === "DRAFT" || application.status === "FINALIZED")
    ) {
      if (body.strategyId !== undefined) {
        // Verify strategy belongs to user
        const strategy = await prisma.strategy.findUnique({
          where: { id: body.strategyId },
          include: {
            authors: {
              select: { userId: true },
            },
          },
        })

        if (!strategy) {
          return badRequestResponse("Strategy not found")
        }

        const isAuthor = strategy.authors.some(
          (author) => author.userId === session.user.id
        )
        if (!isAuthor) {
          return badRequestResponse("You can only apply with your own strategies")
        }

        // Check if this strategy is already used in another application for this hackathon
        if (body.strategyId !== application.strategyId) {
          const existingApplication = await prisma.application.findUnique({
            where: {
              hackathonId_strategyId: {
                hackathonId: hackathon.id,
                strategyId: body.strategyId,
              },
            },
          })

          if (existingApplication && existingApplication.id !== application.id) {
            return conflictResponse("This strategy is already used in another application")
          }
        }

        updateData.strategyId = body.strategyId
      }

      if (body.teamPreferences !== undefined) {
        const preferenceError = validateTeamPreferences({
          teamPreferences: body.teamPreferences,
          hackathonTeamIds: hackathon.teamIds,
          botcampTeamId: botcampTeam?.id ?? null,
          existingPreferences: application.teamPreferences,
        })
        if (preferenceError) {
          return badRequestResponse(preferenceError)
        }

        updateData.teamPreferences = body.teamPreferences
      }

      // Handle status transitions
      if (body.status === "FINALIZED") {
        // Must have a strategy and team preferences to finalize
        const strategyId = body.strategyId || application.strategyId
        const teamPrefs = body.teamPreferences || application.teamPreferences

        if (!strategyId) {
          return badRequestResponse("Please select an agent before finalizing")
        }
        if (!teamPrefs || teamPrefs.length === 0) {
          return badRequestResponse("Please select at least one team preference before finalizing")
        }
        updateData.status = "FINALIZED"
      } else if (body.status === "DRAFT") {
        updateData.status = "DRAFT"
      }
    }

    // Admin can set any status and override selection, unlike the owner
    // branch above which is gated to the REGISTRATION window.
    if (isAdmin) {
      if (body.status !== undefined) {
        updateData.status = body.status
      }

      // Admins edit on a builder's behalf, so the same preference rules apply.
      // This branch previously validated team IDs only, which left both the
      // MAX_TEAM_PREFERENCES cap and the Botcamp exclusion unenforced.
      //
      // Unlike selectedTeamId (a team's pick, made during/after ACTIVE),
      // teamPreferences is the applicant's own ranked wishlist from
      // REGISTRATION — once that window closes it's frozen for everyone,
      // admins included, so a mid-competition edit can't retroactively
      // change what a team was choosing from.
      if (body.teamPreferences !== undefined) {
        const preferencesChanged =
          JSON.stringify(body.teamPreferences) !== JSON.stringify(application.teamPreferences)
        if (preferencesChanged) {
          if (hackathon.status !== "REGISTRATION") {
            return badRequestResponse("Team preferences are locked once registration closes")
          }
          const preferenceError = validateTeamPreferences({
            teamPreferences: body.teamPreferences,
            hackathonTeamIds: hackathon.teamIds,
            botcampTeamId: botcampTeam?.id ?? null,
            existingPreferences: application.teamPreferences,
          })
          if (preferenceError) {
            return badRequestResponse(preferenceError)
          }
          updateData.teamPreferences = body.teamPreferences
        }
      }

      if (body.selectedTeamId !== undefined) {
        if (body.selectedTeamId !== null && !hackathon.teamIds.includes(body.selectedTeamId)) {
          return badRequestResponse(`Invalid team ID: ${body.selectedTeamId}`)
        }
        updateData.selectedTeamId = body.selectedTeamId
      }

      if (body.adminNote !== undefined) {
        updateData.adminNote = body.adminNote
      }
    }

    // If no updates were allowed, return error
    if (Object.keys(updateData).length === 0) {
      return badRequestResponse("No valid updates provided")
    }

    // Update application
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: updateData,
      omit: APPLICANT_OMIT,
      include: {
        strategy: {
          select: {
            id: true,
            slug: true,
            title: true,
            strategyType: true,
          },
        },
        user: {
          select: {
            id: true,
            slug: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
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

    // Notify the applicant when the status actually changed.
    if (updateData.status && updateData.status !== application.status) {
      await sendApplicationStatusEmail(
        id,
        updateData.status as ApplicationStatus
      ).catch((err) =>
        console.error("Failed to send application status email:", err)
      )
    }

    // Submitting to a hackathon makes the strategy PUBLIC — see the matching
    // comment in the POST handler (applications/route.ts) for why.
    if (updateData.status === "FINALIZED") {
      const finalizedStrategyId = updateData.strategyId ?? application.strategyId
      if (finalizedStrategyId) {
        await prisma.strategy.update({
          where: { id: finalizedStrategyId },
          data: { visibility: "PUBLIC" },
        })
      }
    }

    return successResponse(updatedApplication)
  } catch (error) {
    console.error("Error updating application:", error)
    return serverErrorResponse("Failed to update application")
  }
}

// DELETE /api/hackathons/[slug]/applications/[id] - Delete an application
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!session) {
      return unauthorizedResponse()
    }

    const { slug, id } = await params

    // Get hackathon to verify slug
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    // Get application
    const application = await prisma.application.findUnique({
      where: { id },
    })

    if (!application) {
      return notFoundResponse("Application not found")
    }

    // Verify application belongs to this hackathon
    if (application.hackathonId !== hackathon.id) {
      return notFoundResponse("Application not found in this hackathon")
    }

    const isOwner = application.userId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isOwner && !isAdmin) {
      return unauthorizedResponse()
    }

    // Only allow deleting DRAFT applications (or admin can delete any)
    if (!isAdmin && application.status !== "DRAFT") {
      return badRequestResponse("Only draft applications can be withdrawn")
    }

    const blocked = await raceDataBlocksDelete({ applicationId: id }, "application")
    if (blocked) return conflictResponse(blocked)

    await prisma.application.delete({
      where: { id },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Error deleting application:", error)
    return serverErrorResponse("Failed to delete application")
  }
}
