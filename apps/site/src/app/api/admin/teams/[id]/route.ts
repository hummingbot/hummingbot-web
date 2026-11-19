import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { raceDataBlocksDelete } from "@/botcamp/lib/race-data-guard"
import {
  requireAdmin,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Standard team include for responses
const teamInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          slug: true,
          avatarUrl: true,
        },
      },
    },
  },
  _count: {
    select: {
      selectedApplications: true,
    },
  },
}

// GET /api/admin/teams/[id] - Get team with full details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const team = await prisma.team.findUnique({
      where: { id },
      include: teamInclude,
    })

    if (!team) return notFoundResponse("Team not found")

    return successResponse(team)
  } catch (error) {
    console.error("Error fetching team:", error)
    return serverErrorResponse("Failed to fetch team")
  }
}

// PUT /api/admin/teams/[id] - Update team
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const existing = await prisma.team.findUnique({ where: { id } })
    if (!existing) return notFoundResponse("Team not found")

    // Only the fields a team can't edit itself (PATCH /api/teams/[teamSlug]
    // covers the rest, for team members and admins alike).
    const body = await parseBody<{
      slug?: string
      sortOrder?: number
      websiteUrl?: string | null
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    const { slug, sortOrder, websiteUrl } = body

    if (slug !== undefined && !slug.trim()) {
      return badRequestResponse("slug cannot be empty")
    }

    // Check slug conflict if changing
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.team.findUnique({ where: { slug } })
      if (slugConflict) {
        return conflictResponse("A team with this slug already exists")
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        slug: slug ?? existing.slug,
        websiteUrl: websiteUrl !== undefined ? websiteUrl : existing.websiteUrl,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      },
      include: teamInclude,
    })

    return successResponse(team)
  } catch (error) {
    console.error("Error updating team:", error)
    return serverErrorResponse("Failed to update team")
  }
}

// DELETE /api/admin/teams/[id] - Delete team
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) return notFoundResponse("Team not found")

    const blocked = await raceDataBlocksDelete({ application: { selectedTeamId: id } }, "team")
    if (blocked) return conflictResponse(blocked)

    await prisma.team.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting team:", error)
    return serverErrorResponse("Failed to delete team")
  }
}
