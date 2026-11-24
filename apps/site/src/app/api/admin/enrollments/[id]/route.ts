import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"
import { updateUserMembershipStatus } from "@/botcamp/lib/enrollment-utils"

interface RouteContext {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/enrollments/[id] - Admin deletes an enrollment
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await context.params

    const enrollment = await prisma.enrollment.findUnique({ where: { id } })
    if (!enrollment) return notFoundResponse("Enrollment not found")

    const userId = enrollment.userId
    const wasCohortEnrollment = !!enrollment.cohortId

    await prisma.enrollment.delete({ where: { id } })

    // If this was a cohort enrollment, recalculate membership status
    if (wasCohortEnrollment) {
      await updateUserMembershipStatus(userId)
    }

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting enrollment:", error)
    return serverErrorResponse("Failed to delete enrollment")
  }
}
