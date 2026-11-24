import { prisma } from "@/botcamp/lib/prisma"
import {
  notFoundResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/hackathons/[slug]/teams - Get teams for a hackathon (public)
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

    // Get hackathon with teamIds
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: {
        id: true,
        teamIds: true,
        maxSelections: true,
      },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    // If no teams are configured, return empty array
    if (!hackathon.teamIds || hackathon.teamIds.length === 0) {
      return successResponse({
        teams: [],
        maxSelections: hackathon.maxSelections,
      })
    }

    // Get teams with count of selected applications
    const teams = await prisma.team.findMany({
      where: {
        id: { in: hackathon.teamIds },
      },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            selectedApplications: {
              where: {
                hackathonId: hackathon.id,
              },
            },
          },
        },
      },
    })

    return successResponse({
      teams,
      maxSelections: hackathon.maxSelections,
    })
  } catch (error) {
    console.error("Error fetching hackathon teams:", error)
    return serverErrorResponse("Failed to fetch teams")
  }
}
