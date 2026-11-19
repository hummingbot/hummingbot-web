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
  params: Promise<{ id: string }>
}

// DELETE /api/admin/strategy-access/[id] - Admin revokes a manually-granted
// strategy-library access. Grants backed by a Stripe subscription can't be
// revoked here — they're managed through Stripe (webhook/Customer Portal) so
// the DB and the live subscription never disagree.
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await context.params

    const grant = await prisma.strategyAccessGrant.findUnique({ where: { id } })
    if (!grant) return notFoundResponse("Grant not found")

    if (grant.stripeSubscriptionId) {
      return badRequestResponse(
        "This access is tied to a Stripe subscription — cancel it via Stripe instead"
      )
    }

    await prisma.strategyAccessGrant.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error revoking strategy access:", error)
    return serverErrorResponse("Failed to revoke strategy access")
  }
}
