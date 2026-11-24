import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdminOrInstructor,
  canEditCourse,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
  validateRequired,
} from "@/botcamp/lib/api-utils"

// POST /api/admin/sections - Create a new section
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const body = await parseBody<{
      courseId: string
      title: string
      sortOrder?: number
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    const missing = validateRequired(body as Record<string, unknown>, ["courseId", "title"])
    if (missing.length > 0) {
      return badRequestResponse(`${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} required`)
    }

    const { courseId, title, sortOrder } = body

    // Verify course exists and user has access
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return notFoundResponse("Course not found")

    const hasAccess = await canEditCourse(userId, role, courseId)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to edit this course")

    // Get max sortOrder if not provided
    let order = sortOrder
    if (order === undefined) {
      const maxSection = await prisma.section.findFirst({
        where: { courseId },
        orderBy: { sortOrder: "desc" },
      })
      order = (maxSection?.sortOrder ?? -1) + 1
    }

    const section = await prisma.section.create({
      data: {
        courseId,
        title,
        sortOrder: order,
      },
      include: {
        lessons: true,
      },
    })

    return createdResponse(section)
  } catch (error) {
    console.error("Error creating section:", error)
    return serverErrorResponse("Failed to create section")
  }
}
