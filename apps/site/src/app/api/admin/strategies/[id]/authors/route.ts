import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  successResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/strategies/[id]/authors - List authors
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await context.params
    const strategyId = parseInt(id)
    if (isNaN(strategyId)) return badRequestResponse("Invalid strategy ID")

    const authors = await prisma.strategyAuthor.findMany({
      where: { strategyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return successResponse(authors)
  } catch (error) {
    console.error("Failed to get strategy authors:", error)
    return serverErrorResponse("Failed to get strategy authors")
  }
}

// POST /api/admin/strategies/[id]/authors - Add author
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await context.params
    const strategyId = parseInt(id)
    if (isNaN(strategyId)) return badRequestResponse("Invalid strategy ID")

    const body = await parseBody<{ userId: string }>(request)
    if (!body?.userId) return badRequestResponse("userId is required")

    // Check strategy exists
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      select: { id: true },
    })
    if (!strategy) return notFoundResponse("Strategy not found")

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, email: true, firstName: true, lastName: true, slug: true },
    })
    if (!user) return notFoundResponse("User not found")

    // Check if already an author
    const existing = await prisma.strategyAuthor.findUnique({
      where: {
        userId_strategyId: {
          userId: body.userId,
          strategyId,
        },
      },
    })
    if (existing) return badRequestResponse("User is already an author")

    // Add author
    const author = await prisma.strategyAuthor.create({
      data: {
        userId: body.userId,
        strategyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            slug: true,
          },
        },
      },
    })

    return createdResponse(author)
  } catch (error) {
    console.error("Failed to add strategy author:", error)
    return serverErrorResponse("Failed to add strategy author")
  }
}
