import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { sendStrategyStatusEmail } from "@/botcamp/lib/notifications"
import { raceDataBlocksDelete } from "@/botcamp/lib/race-data-guard"
import { Prisma, type StrategyStatus } from "@prisma/client"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  conflictResponse,
  successResponse,
  notFoundResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"
import { strategyInputError } from "@/botcamp/lib/strategy-input"

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/admin/strategies/[id] - Update strategy
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const strategyId = parseInt(id)

    if (isNaN(strategyId)) {
      return badRequestResponse("Invalid ID")
    }

    const body = await parseBody<{
      title?: string
      slug?: string
      cohortId?: string
      summary?: string
      details?: string
      tags?: string[]
      exchanges?: string[]
      videoURL?: string
      status?: string
      visibility?: string
      featured?: boolean
      isFree?: boolean
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    const stored = await prisma.strategy.findUnique({ where: { id: strategyId }, select: { videoURL: true } })
    if (!stored) return notFoundResponse("Strategy not found")
    const inputError = strategyInputError(body, stored.videoURL)
    if (inputError) return badRequestResponse(inputError)

    const {
      title,
      slug,
      cohortId,
      summary,
      details,
      tags,
      exchanges,
      videoURL,
      status,
      visibility,
      featured,
      isFree,
    } = body

    // Build update data with workflow state management
    const updateData: Record<string, unknown> = {
      ...(title && { title }),
      ...(slug && { slug }),
      ...(cohortId !== undefined && { cohortId }),
      ...(summary !== undefined && { summary }),
      ...(details !== undefined && { details }),
      ...(tags && { tags }),
      ...(exchanges && { exchanges }),
      ...(videoURL !== undefined && { videoURL }),
      ...(visibility !== undefined && { visibility }),
      ...(featured !== undefined && { featured }),
      ...(isFree !== undefined && { isFree }),
    }

    // Capture the prior status so we only notify on an actual transition.
    const prior = await prisma.strategy.findUnique({
      where: { id: strategyId },
      select: { status: true },
    })

    // Handle status transitions (admin actions)
    if (status !== undefined) {
      updateData.status = status

      // Set timestamps based on status
      if (status === "SUBMITTED") {
        updateData.submittedAt = new Date()
      } else if (status === "APPROVED") {
        updateData.approvedAt = new Date()
        updateData.approvedById = session.user.id
      } else if (status === "CERTIFIED") {
        updateData.certifiedAt = new Date()
      }
    }

    const strategy = await prisma.strategy.update({
      where: { id: strategyId },
      data: updateData,
      include: {
        authors: {
          select: { userId: true },
        },
      },
    })

    // When a strategy is certified, mark all authors as certified
    if (status === "CERTIFIED") {
      const authorIds = strategy.authors.map((a) => a.userId)
      await prisma.user.updateMany({
        where: { id: { in: authorIds } },
        data: { certified: true },
      })
    }

    // Notify authors when the status actually changed.
    if (status !== undefined && status !== prior?.status) {
      await sendStrategyStatusEmail(strategyId, status as StrategyStatus).catch((err) =>
        console.error("Failed to send strategy status email:", err)
      )
    }

    return successResponse(strategy)
  } catch (error) {
    console.error("Failed to update strategy:", error)
    return serverErrorResponse("Failed to update strategy")
  }
}

// DELETE /api/admin/strategies/[id] - Delete strategy
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const strategyId = parseInt(id)

    if (isNaN(strategyId)) {
      return badRequestResponse("Invalid ID")
    }

    const blocked = await raceDataBlocksDelete({ application: { strategyId } }, "strategy")
    if (blocked) return conflictResponse(blocked)

    await prisma.strategy.delete({
      where: { id: strategyId },
    })

    return successResponse({ success: true })
  } catch (error) {
    // A hackathon's records (its race agents, entries) point at the strategy
    // and aren't deleted with it: say so instead of a bare 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return conflictResponse(
        "This strategy is part of a hackathon's records (it raced or was entered), so it can't be deleted — make it private instead",
      )
    }
    console.error("Failed to delete strategy:", error)
    return serverErrorResponse("Failed to delete strategy")
  }
}
