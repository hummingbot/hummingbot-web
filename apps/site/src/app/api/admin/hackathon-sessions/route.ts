import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
  validateRequired,
} from "@/botcamp/lib/api-utils"

// POST /api/admin/hackathon-sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const body = await parseBody<{
      hackathonId: string
      title: string
      slug?: string
      description?: string
      type?: string
      duration?: number
      isFree?: boolean
      videoId?: string
      content?: string
      date?: string
      sortOrder?: number
      teamId?: string | null
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    const missing = validateRequired(body as Record<string, unknown>, [
      "hackathonId",
      "title",
    ])
    if (missing.length > 0) {
      return badRequestResponse(
        `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`
      )
    }

    const {
      hackathonId,
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
        where: { id: hackathonId },
        select: { teamIds: true },
      })
      if (!hackathon || !hackathon.teamIds.includes(teamId)) {
        return badRequestResponse("Invalid team ID for this hackathon")
      }
    }

    const hackathonSession = await prisma.hackathonSession.create({
      data: {
        hackathonId,
        title,
        slug: slug || null,
        description: description || null,
        type: (type as "VIDEO" | "ARTICLE") || "VIDEO",
        duration: duration || null,
        isFree: isFree !== false,
        videoId: videoId || null,
        content: content || null,
        date: date ? new Date(date) : null,
        sortOrder: sortOrder ?? 0,
        teamId: teamId || null,
      },
    })

    return createdResponse(hackathonSession)
  } catch (error) {
    console.error("Error creating hackathon session:", error)
    return serverErrorResponse("Failed to create hackathon session")
  }
}
