import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdminOrInstructor,
  canEditCourse,
  unauthorizedResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
  badRequestResponse,
} from "@/botcamp/lib/api-utils"

// POST /api/admin/sections/reorder - Reorder sections
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const body = await parseBody<{
      courseId: string
      sectionIds: string[]
    }>(request)

    if (!body?.courseId || !body?.sectionIds) {
      return badRequestResponse("courseId and sectionIds are required")
    }

    const { courseId, sectionIds } = body

    // Check if user can edit the course
    const hasAccess = await canEditCourse(userId, role, courseId)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to edit this course")

    // Update the sort orders, of this course's sections only: the access
    // check was on courseId, so an id from elsewhere must not move.
    await prisma.$transaction(
      sectionIds.map((id, index) =>
        prisma.section.updateMany({
          where: { id, courseId },
          data: { sortOrder: index },
        })
      )
    )

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error reordering sections:", error)
    return serverErrorResponse("Failed to reorder sections")
  }
}
