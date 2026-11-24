import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { HackathonStatus, Prisma } from "@prisma/client"
import { DEFAULT_SLOTS_PER_SQUAD, validateMaxSelections } from "@/botcamp/lib/hackathon-squads"
import { isHackathonStatus, validateRaceWindow } from "@/botcamp/lib/hackathon-stages"
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

// Standard hackathon include for responses
const hackathonInclude = {
  sessions: {
    orderBy: { sortOrder: "asc" as const },
  },
  _count: {
    select: { applications: true },
  },
}

// GET /api/admin/hackathons - Get all hackathons with full details for admin
export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const hackathons = await prisma.hackathon.findMany({
      orderBy: { createdAt: "desc" },
      include: hackathonInclude,
    })

    return successResponse(hackathons)
  } catch (error) {
    console.error("Error fetching hackathons:", error)
    return serverErrorResponse("Failed to fetch hackathons")
  }
}

// POST /api/admin/hackathons - Create a new hackathon
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const body = await parseBody<{
      slug: string
      title: string
      description?: string
      rules?: string
      status?: string
      startDate: string
      endDate: string
      registrationStart?: string
      registrationEnd?: string
      raceStart?: string | null
      raceEnd?: string | null
      maxParticipants?: number
      prizes?: unknown
      teamIds?: string[]
      maxSelections?: number
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    if (body.status !== undefined && !isHackathonStatus(body.status)) {
      return badRequestResponse(`Unknown stage: ${body.status}`)
    }
    const raceError = validateRaceWindow(body.raceStart ?? null, body.raceEnd ?? null)
    if (raceError) return badRequestResponse(raceError)

    // Same bound as the edit route — a hackathon must not be created with a
    // seat count its public pages cannot render.
    if (body.maxSelections !== undefined) {
      const invalid = validateMaxSelections(body.maxSelections)
      if (invalid) return badRequestResponse(invalid)
    }

    // Validate required fields
    const missing = validateRequired(body as Record<string, unknown>, [
      "slug",
      "title",
      "startDate",
      "endDate",
    ])
    if (missing.length > 0) {
      return badRequestResponse(
        `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`
      )
    }

    const {
      slug,
      title,
      description,
      rules,
      status,
      startDate,
      endDate,
      registrationStart,
      registrationEnd,
      raceStart,
      raceEnd,
      maxParticipants,
      prizes,
      teamIds,
      maxSelections,
    } = body

    // Check if slug already exists
    const existing = await prisma.hackathon.findUnique({ where: { slug } })
    if (existing) {
      return conflictResponse("A hackathon with this slug already exists")
    }

    const hackathon = await prisma.hackathon.create({
      data: {
        slug,
        title,
        description: description || null,
        rules: rules || null,
        status: (status as HackathonStatus) || HackathonStatus.DRAFT,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationStart: registrationStart
          ? new Date(registrationStart)
          : null,
        registrationEnd: registrationEnd ? new Date(registrationEnd) : null,
        raceStart: raceStart ? new Date(raceStart) : null,
        raceEnd: raceEnd ? new Date(raceEnd) : null,
        maxParticipants: maxParticipants || null,
        prizes: prizes ? (prizes as Prisma.InputJsonValue) : Prisma.JsonNull,
        teamIds: teamIds || [],
        maxSelections: maxSelections ?? DEFAULT_SLOTS_PER_SQUAD,
      },
      include: {
        sessions: true,
      },
    })

    return createdResponse(hackathon)
  } catch (error) {
    console.error("Error creating hackathon:", error)
    return serverErrorResponse("Failed to create hackathon")
  }
}
