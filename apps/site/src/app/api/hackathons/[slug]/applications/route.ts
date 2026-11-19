import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { APPLICANT_OMIT } from "@/botcamp/lib/applicant-view"
import { isRegistrationOpen } from "@/botcamp/lib/hackathon-stages"
import {
  BOTCAMP_SLUG,
  MAX_APPLICATIONS_PER_HACKATHON,
  validateTeamPreferences,
} from "@/botcamp/lib/hackathon-squads"
import { sendApplicationSubmittedEmail } from "@/botcamp/lib/notifications"
import {
  requireAuth,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  conflictResponse,
  createdResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/hackathons/[slug]/applications - Get current user's applications for this hackathon
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!session) {
      return unauthorizedResponse()
    }

    const { slug } = await params

    // Get hackathon
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    // Get user's applications for this hackathon
    const applications = await prisma.application.findMany({
      where: {
        hackathonId: hackathon.id,
        userId: session.user.id,
      },
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
        selectedTeam: {
          select: {
            id: true,
            slug: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return successResponse(applications)
  } catch (error) {
    console.error("Error fetching hackathon applications:", error)
    return serverErrorResponse("Failed to fetch applications")
  }
}

// POST /api/hackathons/[slug]/applications - Create or update an application
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    if (!session) {
      return unauthorizedResponse()
    }

    const { slug } = await params
    const body = await parseBody<{
      strategyId: number
      teamPreferences: string[]  // Array of team IDs in ranked order
      status?: "DRAFT" | "FINALIZED"
    }>(request)

    if (!body) {
      return badRequestResponse("Invalid request body")
    }

    const { strategyId, teamPreferences, status = "FINALIZED" } = body

    // Validate required fields
    if (!strategyId) {
      return badRequestResponse("Strategy ID is required")
    }
    if (!teamPreferences || teamPreferences.length === 0) {
      return badRequestResponse("At least one team preference is required")
    }

    // Get hackathon with teams
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        teamIds: true,
        startDate: true,
        registrationEnd: true,
      },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    // The stage gates applications; registrationEnd closes them past the deadline
    if (!isRegistrationOpen(hackathon)) {
      return badRequestResponse(
        hackathon.status === "REGISTRATION"
          ? "Applications are closed — the submission deadline has passed"
          : "Applications are not open for this hackathon"
      )
    }

    // Block applications after the submission deadline
    if (hackathon.registrationEnd && new Date() > hackathon.registrationEnd) {
      return badRequestResponse("Applications are closed — the submission deadline has passed")
    }

    // Must be registered for THIS hackathon (not just any hackathon) to apply
    const entry = await prisma.hackathonEntry.findUnique({
      where: {
        hackathonId_userId: {
          hackathonId: hackathon.id,
          userId: session.user.id,
        },
      },
      select: { id: true },
    })

    if (!entry) {
      return badRequestResponse("You must register for this hackathon before applying to a team")
    }

    // Check if strategy is already used in another application for this hackathon
    const existingApplication = await prisma.application.findUnique({
      where: {
        hackathonId_strategyId: {
          hackathonId: hackathon.id,
          strategyId,
        },
      },
    })

    // Ranked-preference rules (count, duplicates, membership in this
    // hackathon, and the Botcamp host-squad exclusion) all live in
    // validateTeamPreferences so the edit route enforces exactly the same set.
    const botcampTeam = await prisma.team.findUnique({
      where: { slug: BOTCAMP_SLUG },
      select: { id: true },
    })
    const preferenceError = validateTeamPreferences({
      teamPreferences,
      hackathonTeamIds: hackathon.teamIds,
      botcampTeamId: botcampTeam?.id ?? null,
      existingPreferences: existingApplication?.teamPreferences ?? [],
    })
    if (preferenceError) {
      return badRequestResponse(preferenceError)
    }

    // Verify strategy exists and belongs to user
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      include: {
        authors: {
          select: { userId: true },
        },
      },
    })

    if (!strategy) {
      return notFoundResponse("Strategy not found")
    }

    const isAuthor = strategy.authors.some(
      (author) => author.userId === session.user.id
    )
    if (!isAuthor) {
      return badRequestResponse("You can only apply with your own strategies")
    }

    // existingApplication was fetched above so the Botcamp legacy allowance
    // could read its current preferences. The ownership conflict below is the
    // same check that has always run here.
    if (existingApplication && existingApplication.userId !== session.user.id) {
      return conflictResponse("This strategy is already used in another application")
    }

    // Cap how many distinct agents a builder can submit per hackathon. Only
    // enforced when this would create a NEW application — updating an
    // existing one (e.g. changing team preferences) doesn't count again.
    if (!existingApplication) {
      const applicationCount = await prisma.application.count({
        where: { hackathonId: hackathon.id, userId: session.user.id },
      })
      if (applicationCount >= MAX_APPLICATIONS_PER_HACKATHON) {
        return badRequestResponse(
          `You can only have ${MAX_APPLICATIONS_PER_HACKATHON} agents per hackathon, including drafts`
        )
      }
    }

    // Create or update application
    const application = await prisma.application.upsert({
      where: {
        hackathonId_strategyId: {
          hackathonId: hackathon.id,
          strategyId,
        },
      },
      update: {
        teamPreferences,
        status,
      },
      create: {
        hackathonId: hackathon.id,
        userId: session.user.id,
        strategyId,
        teamPreferences,
        status,
      },
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
      },
    })

    // Notify the ranked teams and Botcamp admins the first time this
    // application is finalized — not on draft saves or later re-saves.
    if (status === "FINALIZED" && existingApplication?.status !== "FINALIZED") {
      await sendApplicationSubmittedEmail(application.id).catch((err) =>
        console.error("Failed to send application submitted email:", err)
      )
    }

    // Submitting to a hackathon makes the strategy PUBLIC, so that once the
    // race is over it's visible to anyone with an active strategy unlock
    // rather than staying stuck PRIVATE forever. Until then its code stays
    // unpublished: isSubmittedToHackathon (strategy-access.ts) only counts an
    // entry whose race is over, so rivals can't read it mid-race.
    if (status === "FINALIZED") {
      await prisma.strategy.update({
        where: { id: strategyId },
        data: { visibility: "PUBLIC" },
      })
    }

    return createdResponse(application)
  } catch (error) {
    console.error("Error creating hackathon application:", error)
    return serverErrorResponse("Failed to create application")
  }
}
