import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  badRequestResponse,
  notFoundResponse,
  parseBody,
  requireAuth,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/botcamp/lib/api-utils"

interface ProgressBody {
  positionSeconds?: number
  completed?: boolean
}

/**
 * Records video playback progress for a lesson. Called periodically by the
 * player (and once on pause/end) — never on mere page load, so opening a
 * lesson to peek at it doesn't count as completing it. `completedAt` is set
 * the first time `completed: true` is reported and never cleared after,
 * even if the viewer later rewinds.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const session = await requireAuth()
    if (!session?.user?.id) return unauthorizedResponse()

    const { lessonId } = await params
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    })
    if (!lesson) return notFoundResponse("Lesson not found")

    const body = await parseBody<ProgressBody>(request)
    if (!body || typeof body.positionSeconds !== "number" || body.positionSeconds < 0) {
      return badRequestResponse("positionSeconds must be a non-negative number")
    }
    const positionSeconds = Math.floor(body.positionSeconds)
    const completed = body.completed === true

    const userId = session.user.id
    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { completedAt: true },
    })

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        positionSeconds,
        completedAt: completed ? new Date() : null,
      },
      update: {
        positionSeconds,
        completedAt: completed ? (existing?.completedAt ?? new Date()) : undefined,
      },
      select: { positionSeconds: true, completedAt: true },
    })

    return successResponse({
      positionSeconds: progress.positionSeconds,
      completed: !!progress.completedAt,
    })
  } catch (error) {
    console.error("Failed to save lesson progress:", error)
    return serverErrorResponse("Failed to save lesson progress")
  }
}
