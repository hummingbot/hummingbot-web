import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdminOrInstructor,
  canEditCourse,
  unauthorizedResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/admin/sections/[id] - Update section
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const { id } = await params
    const existing = await prisma.section.findUnique({ where: { id } })
    if (!existing) return notFoundResponse("Section not found")

    // Check if user can edit the parent course
    const hasAccess = await canEditCourse(userId, role, existing.courseId)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to edit this section")

    const body = await parseBody<{
      title?: string
      sortOrder?: number
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    const { title, sortOrder } = body

    const section = await prisma.section.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      },
      include: {
        lessons: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return successResponse(section)
  } catch (error) {
    console.error("Error updating section:", error)
    return serverErrorResponse("Failed to update section")
  }
}

// DELETE /api/admin/sections/[id] - Delete section
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const { id } = await params
    const section = await prisma.section.findUnique({ where: { id } })
    if (!section) return notFoundResponse("Section not found")

    // Check if user can edit the parent course
    const hasAccess = await canEditCourse(userId, role, section.courseId)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to delete this section")

    await prisma.section.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting section:", error)
    return serverErrorResponse("Failed to delete section")
  }
}
