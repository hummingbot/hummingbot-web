import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { CohortStatus } from "@prisma/client"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  conflictResponse,
  successResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
  validateRequired,
} from "@/botcamp/lib/api-utils"

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
  _count: {
    select: { enrollments: true },
  },
}

// GET /api/admin/cohorts - Get all cohorts with full details for admin
export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const cohorts = await prisma.cohort.findMany({
      orderBy: { number: "desc" },
      include: cohortInclude,
    })

    return successResponse(cohorts)
  } catch (error) {
    console.error("Error fetching cohorts:", error)
    return serverErrorResponse("Failed to fetch cohorts")
  }
}

// POST /api/admin/cohorts - Create a new cohort
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const body = await parseBody<{
      number: number
      title?: string
      description?: string
      status?: string
      startDate: string
      endDate: string
      price?: number
      maxStudents?: number
      retainedSeats?: number
      registrationUrl?: string
      demoDayUrl?: string
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    // Validate required fields
    const missing = validateRequired(body as Record<string, unknown>, ["number", "startDate", "endDate"])
    if (missing.length > 0) {
      return badRequestResponse(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`)
    }

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

    // Check if cohort number already exists
    const existing = await prisma.cohort.findUnique({ where: { number } })
    if (existing) {
      return conflictResponse("A cohort with this number already exists")
    }

    const cohort = await prisma.cohort.create({
      data: {
        number,
        slug: `cohort-${number}`,
        title: title || null,
        description: description || null,
        status: (status as CohortStatus) || CohortStatus.UPCOMING,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        price: price || null,
        maxStudents: maxStudents || null,
        retainedSeats: retainedSeats || 0,
        registrationUrl: registrationUrl || null,
        demoDayUrl: demoDayUrl || null,
      },
      include: {
        weeks: {
          include: { lessons: true },
        },
      },
    })

    return createdResponse(cohort)
  } catch (error) {
    console.error("Error creating cohort:", error)
    return serverErrorResponse("Failed to create cohort")
  }
}
