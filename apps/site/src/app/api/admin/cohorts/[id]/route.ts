import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { CohortStatus } from "@prisma/client"
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

// Standard cohort include for responses
const cohortInclude = {
  weeks: {
    orderBy: { weekNumber: "asc" as const },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" as const },
      },
    },
  },
}

// GET /api/admin/cohorts/[id] - Get cohort with full details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const cohort = await prisma.cohort.findUnique({
      where: { id },
      include: cohortInclude,
    })

    if (!cohort) return notFoundResponse("Cohort not found")

    return successResponse(cohort)
  } catch (error) {
    console.error("Error fetching cohort:", error)
    return serverErrorResponse("Failed to fetch cohort")
  }
}

// PUT /api/admin/cohorts/[id] - Update cohort
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const existing = await prisma.cohort.findUnique({ where: { id } })
    if (!existing) return notFoundResponse("Cohort not found")

    const body = await parseBody<{
      number?: number
      title?: string
      description?: string
      status?: string
      startDate?: string
      endDate?: string
      price?: number
      maxStudents?: number
      retainedSeats?: number
      registrationUrl?: string
      demoDayUrl?: string
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    const {
      number,
      title,
      description,
      status,
      startDate,
      endDate,
      price,
      maxStudents,
      retainedSeats,
      registrationUrl,
      demoDayUrl,
    } = body

    // Check number conflict
    if (number && number !== existing.number) {
      const numberConflict = await prisma.cohort.findUnique({ where: { number } })
      if (numberConflict) {
        return conflictResponse("A cohort with this number already exists")
      }
    }

    const cohort = await prisma.cohort.update({
      where: { id },
      data: {
        number: number ?? existing.number,
        slug: number ? `cohort-${number}` : existing.slug,
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        status: (status as CohortStatus) ?? existing.status,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: endDate ? new Date(endDate) : existing.endDate,
        price: price !== undefined ? price : existing.price,
        maxStudents: maxStudents !== undefined ? maxStudents : existing.maxStudents,
        retainedSeats: retainedSeats !== undefined ? retainedSeats : existing.retainedSeats,
        registrationUrl: registrationUrl !== undefined ? registrationUrl : existing.registrationUrl,
        demoDayUrl: demoDayUrl !== undefined ? demoDayUrl : existing.demoDayUrl,
      },
      include: cohortInclude,
    })

    return successResponse(cohort)
  } catch (error) {
    console.error("Error updating cohort:", error)
    return serverErrorResponse("Failed to update cohort")
  }
}

// DELETE /api/admin/cohorts/[id] - Delete cohort
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const cohort = await prisma.cohort.findUnique({ where: { id } })
    if (!cohort) return notFoundResponse("Cohort not found")

    await prisma.cohort.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting cohort:", error)
    return serverErrorResponse("Failed to delete cohort")
  }
}
