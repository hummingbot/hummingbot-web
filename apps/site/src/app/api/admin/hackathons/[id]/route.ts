import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { HackathonStatus, Prisma } from "@prisma/client"
import { validateMaxSelections } from "@/botcamp/lib/hackathon-squads"
import { SnapshotError, fetchSnapshotProposal, matchTeamsToChoices } from "@/botcamp/lib/snapshot"
import { isHackathonStatus, validateRaceWindow } from "@/botcamp/lib/hackathon-stages"
import { parseFaq } from "@/botcamp/lib/hackathon-faq"
import { parseRaceHosts, parseStarterKit } from "@/botcamp/lib/hackathon-starter-kit"
import {
  requireAdmin,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Standard hackathon include for responses
const hackathonInclude = {
  sessions: {
    orderBy: { sortOrder: "asc" as const },
  },
  applications: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          slug: true,
        },
      },
      strategy: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
}

// GET /api/admin/hackathons/[id] - Get hackathon with full details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const hackathon = await prisma.hackathon.findUnique({
      where: { id },
      include: hackathonInclude,
    })

    if (!hackathon) return notFoundResponse("Hackathon not found")

    return successResponse(hackathon)
  } catch (error) {
    console.error("Error fetching hackathon:", error)
    return serverErrorResponse("Failed to fetch hackathon")
  }
}

// PUT /api/admin/hackathons/[id] - Update hackathon
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const existing = await prisma.hackathon.findUnique({ where: { id } })
    if (!existing) return notFoundResponse("Hackathon not found")

    const body = await parseBody<{
      slug?: string
      title?: string
      description?: string
      rules?: string
      status?: string
      startDate?: string
      endDate?: string
      registrationStart?: string
      registrationEnd?: string
      raceStart?: string | null
      raceEnd?: string | null
      maxParticipants?: number
      prizes?: unknown
      teamIds?: string[]
      maxSelections?: number
      finalViewers?: number | null
      showcaseOnStrategies?: boolean
      snapshotProposalId?: string | null
      /** FAQ items; null resets to the default template. */
      faq?: unknown
      /** Starter kit; null resets to the default kit. */
      starterKit?: unknown
      raceHosts?: unknown
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    if (body.status !== undefined && !isHackathonStatus(body.status)) {
      return badRequestResponse(`Unknown stage: ${body.status}`)
    }

    let faq: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined
    if (body.faq === null) {
      faq = Prisma.DbNull
    } else if (body.faq !== undefined) {
      const parsed = parseFaq(body.faq)
      if ("error" in parsed) return badRequestResponse(parsed.error)
      faq = parsed.items as unknown as Prisma.InputJsonValue
    }

    let starterKit: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined
    if (body.starterKit === null) {
      starterKit = Prisma.DbNull
    } else if (body.starterKit !== undefined) {
      const parsed = parseStarterKit(body.starterKit)
      if ("error" in parsed) return badRequestResponse(parsed.error)
      starterKit = parsed.kit as unknown as Prisma.InputJsonValue
    }

    let raceHosts: Prisma.InputJsonValue | undefined
    if (body.raceHosts !== undefined) {
      const parsed = parseRaceHosts(body.raceHosts ?? [])
      if ("error" in parsed) return badRequestResponse(parsed.error)
      raceHosts = parsed.hosts as unknown as Prisma.InputJsonValue
    }

    // maxSelections drives seat-render loops and the selection cap, so an
    // out-of-range value breaks the public pages rather than just this write.
    if (body.maxSelections !== undefined) {
      const invalid = validateMaxSelections(body.maxSelections)
      if (invalid) return badRequestResponse(invalid)
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
      finalViewers,
      showcaseOnStrategies,
    } = body

    const raceError = validateRaceWindow(
      raceStart !== undefined ? raceStart : existing.raceStart?.toISOString() ?? null,
      raceEnd !== undefined ? raceEnd : existing.raceEnd?.toISOString() ?? null,
    )
    if (raceError) return badRequestResponse(raceError)

    // The leaderboard scores the vote from this proposal, so check it now —
    // a wrong ID, voting type, or team name would otherwise only surface as
    // a "vote unavailable" banner on the public page.
    const snapshotProposalId =
      body.snapshotProposalId === undefined ? undefined : body.snapshotProposalId?.trim() || null
    if (snapshotProposalId) {
      const teams = await prisma.team.findMany({
        where: { id: { in: teamIds ?? existing.teamIds } },
        select: { id: true, name: true },
      })
      try {
        matchTeamsToChoices(await fetchSnapshotProposal(snapshotProposalId), teams)
      } catch (err) {
        if (err instanceof SnapshotError) return badRequestResponse(`Snapshot proposal: ${err.message}`)
        throw err
      }
    }

    // Check slug conflict
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.hackathon.findUnique({
        where: { slug },
      })
      if (slugConflict) {
        return conflictResponse("A hackathon with this slug already exists")
      }
    }

    const hackathon = await prisma.hackathon.update({
      where: { id },
      data: {
        slug: slug ?? existing.slug,
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        rules: rules !== undefined ? rules : existing.rules,
        status: (status as HackathonStatus | undefined) ?? existing.status,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: endDate ? new Date(endDate) : existing.endDate,
        registrationStart: registrationStart !== undefined
          ? registrationStart
            ? new Date(registrationStart)
            : null
          : existing.registrationStart,
        registrationEnd: registrationEnd !== undefined
          ? registrationEnd
            ? new Date(registrationEnd)
            : null
          : existing.registrationEnd,
        raceStart: raceStart !== undefined ? (raceStart ? new Date(raceStart) : null) : undefined,
        raceEnd: raceEnd !== undefined ? (raceEnd ? new Date(raceEnd) : null) : undefined,
        maxParticipants:
          maxParticipants !== undefined
            ? maxParticipants
            : existing.maxParticipants,
        prizes: prizes !== undefined
          ? prizes
            ? (prizes as Prisma.InputJsonValue)
            : Prisma.JsonNull
          : undefined,
        teamIds: teamIds !== undefined ? teamIds : undefined,
        maxSelections: maxSelections !== undefined ? maxSelections : undefined,
        finalViewers: finalViewers !== undefined ? finalViewers : undefined,
        showcaseOnStrategies:
          typeof showcaseOnStrategies === "boolean" ? showcaseOnStrategies : undefined,
        snapshotProposalId,
        faq,
        starterKit,
        raceHosts,
      },
      include: hackathonInclude,
    })

    return successResponse(hackathon)
  } catch (error) {
    console.error("Error updating hackathon:", error)
    return serverErrorResponse("Failed to update hackathon")
  }
}

// DELETE /api/admin/hackathons/[id] - Delete hackathon
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const hackathon = await prisma.hackathon.findUnique({ where: { id } })
    if (!hackathon) return notFoundResponse("Hackathon not found")

    await prisma.hackathon.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting hackathon:", error)
    return serverErrorResponse("Failed to delete hackathon")
  }
}
