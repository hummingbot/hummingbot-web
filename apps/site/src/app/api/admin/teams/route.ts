import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  conflictResponse,
  notFoundResponse,
  successResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
  validateRequired,
} from "@/botcamp/lib/api-utils"

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

// GET /api/admin/teams - Get all teams with full details for admin
export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const teams = await prisma.team.findMany({
      orderBy: { sortOrder: "asc" },
      include: teamInclude,
    })

    return successResponse(teams)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return serverErrorResponse("Failed to fetch teams")
  }
}

// POST /api/admin/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    // A team is created from its identity alone. Everything else is set on
    // /admin/teams/[id] — the team info form (PATCH /api/teams/[teamSlug]),
    // members, and the admin-only settings (PUT /api/admin/teams/[id]).
    const body = await parseBody<{
      name: string
      slug: string
      sortOrder?: number
      /** Also add the new team to this hackathon's teams, in the same write. */
      hackathonId?: string
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    // Validate required fields
    const missing = validateRequired(body as Record<string, unknown>, ["name", "slug"])
    if (missing.length > 0) {
      return badRequestResponse(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`)
    }

    const { name, slug, sortOrder, hackathonId } = body

    // Check if team slug already exists
    const existing = await prisma.team.findUnique({ where: { slug } })
    if (existing) {
      return conflictResponse("A team with this slug already exists")
    }

    const hackathon = hackathonId
      ? await prisma.hackathon.findUnique({ where: { id: hackathonId }, select: { id: true } })
      : null
    if (hackathonId && !hackathon) return notFoundResponse("Hackathon not found")

    // Without an explicit sort order a new team goes last, not ahead of every
    // existing team (they all sort ascending, and most sit above 0).
    const nextSortOrder =
      sortOrder ?? ((await prisma.team.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1
    const data = { name, slug, sortOrder: nextSortOrder }

    const team = hackathon
      ? await prisma.$transaction(async (tx) => {
          const created = await tx.team.create({ data, include: teamInclude })
          await tx.hackathon.update({
            where: { id: hackathon.id },
            data: { teamIds: { push: created.id } },
          })
          return created
        })
      : await prisma.team.create({ data, include: teamInclude })

    return createdResponse(team)
  } catch (error) {
    console.error("Error creating team:", error)
    return serverErrorResponse("Failed to create team")
  }
}
