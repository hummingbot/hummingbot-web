import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdminOrInstructor,
  canEditCourse,
  getCourseIdFromSection,
  unauthorizedResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
  badRequestResponse,
} from "@/botcamp/lib/api-utils"

// POST /api/admin/lessons/reorder - Reorder lessons within a section
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const body = await parseBody<{
      sectionId: string
      lessonIds: string[]
    }>(request)

    if (!body?.sectionId || !body?.lessonIds) {
      return badRequestResponse("sectionId and lessonIds are required")
    }

    const { sectionId, lessonIds } = body

    // Get course ID from section
    const courseId = await getCourseIdFromSection(sectionId)
    if (!courseId) return badRequestResponse("Invalid section")

    // Check if user can edit the course
    const hasAccess = await canEditCourse(userId, role, courseId)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to edit this course")

    // Update the sort orders, of this section's lessons only: the access
    // check was on sectionId, so an id from elsewhere must not move.
    await prisma.$transaction(
      lessonIds.map((id, index) =>
        prisma.lesson.updateMany({
          where: { id, sectionId },
          data: { sortOrder: index },
        })
      )
    )

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error reordering lessons:", error)
    return serverErrorResponse("Failed to reorder lessons")
  }
}
