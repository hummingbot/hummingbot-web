import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string; userId: string }>
}

// DELETE /api/admin/teams/[id]/members/[userId] - Remove a member from a team
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id, userId } = await params

    // Check if membership exists
    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userId,
        },
      },
    })

    if (!member) {
      return notFoundResponse("Team member not found")
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userId,
        },
      },
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error removing team member:", error)
    return serverErrorResponse("Failed to remove team member")
  }
}
