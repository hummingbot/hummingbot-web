import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { getRaceWindow, FINALS_SESSION_SELECT } from "@/botcamp/lib/hackathon-stages"
import {
  checkRaceFeedAuth,
  getRaceRosterBySlug,
  ingestRaceReading,
  raceReadingSchema,
} from "@/botcamp/lib/race-feed"
import { badRequestResponse, notFoundResponse, serverErrorResponse, successResponse } from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// Machine-to-machine: never cached anywhere.
const NO_STORE = { "Cache-Control": "no-store" }

async function authorize(request: NextRequest, slug: string) {
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: { id: true, slug: true, teamIds: true, raceFeedTokenHash: true, ...FINALS_SESSION_SELECT },
  })
  // An unknown hackathon and one with no feed token look the same: 404.
  const auth = checkRaceFeedAuth(request.headers.get("authorization"), hackathon?.raceFeedTokenHash ?? null)
  if (!hackathon || auth === "disabled") return { error: notFoundResponse("Not found") }
  if (auth === "unauthorized") {
    return {
      error: NextResponse.json(
        { error: "Invalid race feed token" },
        { status: 401, headers: { "WWW-Authenticate": "Bearer", ...NO_STORE } },
      ),
    }
  }
  return { hackathon }
}

// GET /api/hackathons/[slug]/race-data - The agents the feed reports on (race feed token)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const { hackathon, error } = await authorize(request, slug)
    if (error) return error

    const roster = await getRaceRosterBySlug(hackathon.id, hackathon.teamIds)
    const finals = getRaceWindow(hackathon)
    const response = successResponse({
      hackathon: hackathon.slug,
      race_start: finals.start.toISOString(),
      race_end: finals.end.toISOString(),
      agents: roster.map((r) => ({
        agent_id: r.agentId,
        strategy_title: r.strategyTitle,
        team: r.team,
        driver: r.driver,
      })),
    })
    response.headers.set("Cache-Control", NO_STORE["Cache-Control"])
    return response
  } catch (err) {
    console.error("Error reading race feed roster:", err)
    return serverErrorResponse("Failed to read the race roster")
  }
}

// POST /api/hackathons/[slug]/race-data - Store one reading from the Condor routine (race feed token)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const { hackathon, error } = await authorize(request, slug)
    if (error) return error

    const body = await request.json().catch(() => null)
    const parsed = raceReadingSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return badRequestResponse(`Invalid reading: ${issue.path.join(".") || "body"} — ${issue.message}`)
    }

    const result = await ingestRaceReading(hackathon, parsed.data)
    if (!result.ok) return badRequestResponse(result.error)

    const response = successResponse({ accepted: result.accepted, unknown: result.unknown })
    response.headers.set("Cache-Control", NO_STORE["Cache-Control"])
    return response
  } catch (err) {
    console.error("Error storing race reading:", err)
    return serverErrorResponse("Failed to store the reading")
  }
}
