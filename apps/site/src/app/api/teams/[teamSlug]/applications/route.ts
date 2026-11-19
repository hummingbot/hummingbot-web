import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireTeamMember,
  unauthorizedResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"
import { ApplicationStatus } from "@prisma/client"
import { teamReviewableApplicationsWhere } from "@/botcamp/lib/team-admin"

interface RouteParams {
  params: Promise<{ teamSlug: string }>
}

// GET /api/teams/[teamSlug]/applications - Get all applications for this team
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamSlug } = await params

    // Look up team by slug
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      select: { id: true },
    })

    if (!team) {
      return notFoundResponse("Team not found")
    }

    // Check team membership
    const session = await requireTeamMember(team.id)
    if (!session) {
      return unauthorizedResponse()
    }

    // Get status filter from query params
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get("status")

    // Applications this team may review: submitted ones that ranked it, and
    // any it selected. Drafts stay out whatever ?status= asks for.
    const applications = await prisma.application.findMany({
      where: {
        ...teamReviewableApplicationsWhere(team.id),
        ...(statusParam && {
          status: statusParam as ApplicationStatus,
        }),
      },
      // The legacy shared note column: it holds whichever ranked team wrote last.
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
            updatedAt: true,
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
      },
      orderBy: { createdAt: "desc" },
    })

    // Calculate this team's preference rank for each application
    const applicationsWithRank = applications.map((app) => ({
      ...app,
      preferenceRank: app.teamPreferences.indexOf(team.id) + 1,
      isSelectedByThisTeam: app.selectedTeamId === team.id,
    }))

    return successResponse(applicationsWithRank)
  } catch (error) {
    console.error("Error fetching team applications:", error)
    return serverErrorResponse("Failed to fetch team applications")
  }
}
