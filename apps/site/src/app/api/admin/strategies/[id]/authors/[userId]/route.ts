import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"

interface RouteContext {
  params: Promise<{ id: string; userId: string }>
}

// DELETE /api/admin/strategies/[id]/authors/[userId] - Remove author
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id, userId } = await context.params
    const strategyId = parseInt(id)
    if (isNaN(strategyId)) return badRequestResponse("Invalid strategy ID")

    // Check if author exists
    const author = await prisma.strategyAuthor.findUnique({
      where: {
        userId_strategyId: {
          userId,
          strategyId,
        },
      },
    })
    if (!author) return notFoundResponse("Author not found")

    // Delete author
    await prisma.strategyAuthor.delete({
      where: {
        userId_strategyId: {
          userId,
          strategyId,
        },
      },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Failed to remove strategy author:", error)
    return serverErrorResponse("Failed to remove strategy author")
  }
}
