import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/hackathon-sessions/[id] - Get session
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const hackathonSession = await prisma.hackathonSession.findUnique({
      where: { id },
    })

    if (!hackathonSession) return notFoundResponse("Session not found")

    return successResponse(hackathonSession)
  } catch (error) {
    console.error("Error fetching hackathon session:", error)
    return serverErrorResponse("Failed to fetch hackathon session")
  }
}

// PUT /api/admin/hackathon-sessions/[id] - Update session
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const existing = await prisma.hackathonSession.findUnique({
      where: { id },
    })
    if (!existing) return notFoundResponse("Session not found")

    const body = await parseBody<{
      title?: string
      slug?: string
      description?: string
      type?: string
      duration?: number | null
      isFree?: boolean
      videoId?: string | null
      content?: string | null
      date?: string | null
      sortOrder?: number
      teamId?: string | null
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    const {
      title,
      slug,
      description,
      type,
      duration,
      isFree,
      videoId,
      content,
      date,
      sortOrder,
      teamId,
    } = body

    if (teamId) {
      const hackathon = await prisma.hackathon.findUnique({
        where: { id: existing.hackathonId },
        select: { teamIds: true },
      })
      if (!hackathon || !hackathon.teamIds.includes(teamId)) {
        return badRequestResponse("Invalid team ID for this hackathon")
      }
    }

    const hackathonSession = await prisma.hackathonSession.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        slug: slug !== undefined ? slug : existing.slug,
        description:
          description !== undefined ? description : existing.description,
        type: type !== undefined ? (type as "VIDEO" | "ARTICLE") : existing.type,
        duration: duration !== undefined ? duration : existing.duration,
        isFree: isFree !== undefined ? isFree : existing.isFree,
        videoId: videoId !== undefined ? videoId : existing.videoId,
        content: content !== undefined ? content : existing.content,
        date: date !== undefined ? (date ? new Date(date) : null) : existing.date,
        sortOrder: sortOrder ?? existing.sortOrder,
        teamId: teamId !== undefined ? teamId : existing.teamId,
      },
    })

    return successResponse(hackathonSession)
  } catch (error) {
    console.error("Error updating hackathon session:", error)
    return serverErrorResponse("Failed to update hackathon session")
  }
}

// DELETE /api/admin/hackathon-sessions/[id] - Delete session
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const hackathonSession = await prisma.hackathonSession.findUnique({
      where: { id },
    })
    if (!hackathonSession) return notFoundResponse("Session not found")

    await prisma.hackathonSession.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting hackathon session:", error)
    return serverErrorResponse("Failed to delete hackathon session")
  }
}
