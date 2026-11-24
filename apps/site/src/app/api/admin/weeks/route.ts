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

// POST /api/admin/weeks - Create a new cohort week
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const body = await parseBody<{
      cohortId: string
      weekNumber: number
      title: string
      description?: string
      date?: string
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    const { cohortId, weekNumber, title, description, date } = body

    if (!cohortId || weekNumber === undefined || !title) {
      return badRequestResponse("cohortId, weekNumber, and title are required")
    }

    // Verify cohort exists
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } })
    if (!cohort) return notFoundResponse("Cohort not found")

    // Check if week number already exists for this cohort
    const existingWeek = await prisma.cohortWeek.findUnique({
      where: {
        cohortId_weekNumber: { cohortId, weekNumber },
      },
    })

    if (existingWeek) {
      return conflictResponse("This week number already exists for this cohort")
    }

    const week = await prisma.cohortWeek.create({
      data: {
        cohortId,
        weekNumber,
        title,
        description: description || null,
        date: date ? new Date(date) : null,
      },
      include: {
        lessons: true,
      },
    })

    return createdResponse(week)
  } catch (error) {
    console.error("Error creating week:", error)
    return serverErrorResponse("Failed to create week")
  }
}
