import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { CourseLevel } from "@prisma/client"
import {
  requireAdminOrInstructor,
  canEditCourse,
  unauthorizedResponse,
  notFoundResponse,
  conflictResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Standard course include for responses
const courseInclude = {
  sections: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" as const },
      },
    },
  },
  instructor: {
    select: { id: true, name: true, email: true },
  },
}

// GET /api/admin/courses/[id] - Get course with full details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const userId = session.user.id
    const role = session.user.role

    // Check if user can access this course
    const hasAccess = await canEditCourse(userId, role, id)
    if (!hasAccess) return unauthorizedResponse("You don't have access to this course")

    const course = await prisma.course.findUnique({
      where: { id },
      include: courseInclude,
    })

    if (!course) return notFoundResponse("Course not found")

    return successResponse(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return serverErrorResponse("Failed to fetch course")
  }
}

// PUT /api/admin/courses/[id] - Update course
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const userId = session.user.id
    const role = session.user.role

    // Check if user can edit this course
    const hasAccess = await canEditCourse(userId, role, id)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to edit this course")

    const existing = await prisma.course.findUnique({ where: { id } })
    if (!existing) return notFoundResponse("Course not found")

    const body = await parseBody<{
      title?: string
      slug?: string
      description?: string
      level?: string
      price?: number
      tags?: string[]
      published?: boolean
      sortOrder?: number
      instructorId?: string
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    const { title, slug, description, level, price, tags, published, sortOrder, instructorId } = body

    // Check slug conflict
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.course.findUnique({ where: { slug } })
      if (slugConflict) {
        return conflictResponse("A course with this slug already exists")
      }
    }

    // Only admins can change instructorId
    const newInstructorId = role === "ADMIN" && instructorId !== undefined
      ? (instructorId || null)
      : existing.instructorId

    const course = await prisma.course.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        slug: slug ?? existing.slug,
        description: description !== undefined ? description : existing.description,
        level: (level as CourseLevel) ?? existing.level,
        price: price !== undefined ? price : existing.price,
        tags: tags ?? existing.tags,
        published: published !== undefined ? published : existing.published,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        instructorId: newInstructorId,
      },
      include: courseInclude,
    })

    // Auto-enroll new instructor if instructor changed
    if (newInstructorId && newInstructorId !== existing.instructorId) {
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: newInstructorId,
            courseId: id,
          },
        },
        update: {},
        create: {
          userId: newInstructorId,
          courseId: id,
          pricePaid: 0,
        },
      })
    }

    return successResponse(course)
  } catch (error) {
    console.error("Error updating course:", error)
    return serverErrorResponse("Failed to update course")
  }
}

// DELETE /api/admin/courses/[id] - Delete course
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const userId = session.user.id
    const role = session.user.role

    // Check if user can delete this course
    const hasAccess = await canEditCourse(userId, role, id)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to delete this course")

    const course = await prisma.course.findUnique({ where: { id } })
    if (!course) return notFoundResponse("Course not found")

    await prisma.course.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting course:", error)
    return serverErrorResponse("Failed to delete course")
  }
}
