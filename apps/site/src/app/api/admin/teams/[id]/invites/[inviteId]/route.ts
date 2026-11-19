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
  params: Promise<{ id: string; inviteId: string }>
}

// DELETE /api/admin/teams/[id]/invites/[inviteId] - Revoke a pending invite.
// Only pending invites are deletable; an accepted invite is history (the
// person is a TeamMember by then — remove them via the members endpoint).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id, inviteId } = await params
    const invite = await prisma.teamInvite.findUnique({ where: { id: inviteId } })
    if (!invite || invite.teamId !== id || invite.acceptedAt) {
      return notFoundResponse("Pending invite not found")
    }

    await prisma.teamInvite.delete({ where: { id: inviteId } })
    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Error revoking team invite:", error)
    return serverErrorResponse("Failed to revoke invite")
  }
}
