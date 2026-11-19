import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  conflictResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"
import { getActiveStrategyGrant, grantManualStrategyAccess } from "@/botcamp/lib/strategy-access"

// POST /api/admin/strategy-access - Admin grants strategy-library access
// directly, with no Stripe subscription behind it (comps, partners, etc).
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const body = await parseBody<{ userId: string }>(request)
    if (!body?.userId) return badRequestResponse("userId is required")

    const user = await prisma.user.findUnique({ where: { id: body.userId } })
    if (!user) return notFoundResponse("User not found")

    const existing = await getActiveStrategyGrant(body.userId)
    if (existing) return conflictResponse("User already has active strategy access")

    const grant = await grantManualStrategyAccess(body.userId)

    return createdResponse(grant)
  } catch (error) {
    console.error("Error granting strategy access:", error)
    return serverErrorResponse("Failed to grant strategy access")
  }
}
