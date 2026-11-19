import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  getCachedHackathonLeaderboard,
  getCachedRaceReplay,
  LEADERBOARD_CACHE_SECONDS,
  type ReplayFrame,
} from "@/botcamp/lib/hackathon-leaderboard-data"
import { findRaceWindow, FINALS_SESSION_SELECT } from "@/botcamp/lib/hackathon-stages"
import { notFoundResponse, serverErrorResponse, successResponse } from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/hackathons/[slug]/replay - The race replay's frames (issue #140).
// The Cup page fetches them when the replay nears the screen, rather than
// embedding them (~120 KB) in its HTML.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true, status: true, ...FINALS_SESSION_SELECT },
    })
    if (!hackathon || hackathon.status === "DRAFT") {
      return notFoundResponse("Hackathon not found")
    }

    // Same inputs as the page: no frames until the board is scored and has agents.
    const race = findRaceWindow(hackathon)
    let frames: Record<string, ReplayFrame[]> = {}
    if (race) {
      const start = race.start.toISOString()
      const end = race.end.toISOString()
      const leaderboard = await getCachedHackathonLeaderboard(hackathon.id, start, end)
      if (leaderboard.scored && leaderboard.agents.length > 0) {
        frames = await getCachedRaceReplay(hackathon.id, start, end, leaderboard.teamVotes)
      }
    }

    const response = successResponse(frames)
    // Public and identical for every viewer, refreshed as often as the board.
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${LEADERBOARD_CACHE_SECONDS}, stale-while-revalidate=${LEADERBOARD_CACHE_SECONDS * 4}`,
    )
    return response
  } catch (error) {
    console.error("Error fetching race replay:", error)
    return serverErrorResponse("Failed to fetch race replay")
  }
}
