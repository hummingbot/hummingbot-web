import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
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

// PUT /api/admin/weeks/[id] - Update cohort week
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const existing = await prisma.cohortWeek.findUnique({ where: { id } })
    if (!existing) return notFoundResponse("Week not found")

    const body = await parseBody<{
      weekNumber?: number
      title?: string
      description?: string
      date?: string
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    const { weekNumber, title, description, date } = body

    // Check weekNumber conflict
    if (weekNumber !== undefined && weekNumber !== existing.weekNumber) {
      const conflict = await prisma.cohortWeek.findUnique({
        where: {
          cohortId_weekNumber: { cohortId: existing.cohortId, weekNumber },
        },
      })
      if (conflict) {
        return conflictResponse("This week number already exists for this cohort")
      }
    }

    const week = await prisma.cohortWeek.update({
      where: { id },
      data: {
        weekNumber: weekNumber ?? existing.weekNumber,
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        date: date !== undefined ? (date ? new Date(date) : null) : existing.date,
      },
      include: {
        lessons: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return successResponse(week)
  } catch (error) {
    console.error("Error updating week:", error)
    return serverErrorResponse("Failed to update week")
  }
}

// DELETE /api/admin/weeks/[id] - Delete cohort week
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const week = await prisma.cohortWeek.findUnique({ where: { id } })
    if (!week) return notFoundResponse("Week not found")

    await prisma.cohortWeek.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting week:", error)
    return serverErrorResponse("Failed to delete week")
  }
}
