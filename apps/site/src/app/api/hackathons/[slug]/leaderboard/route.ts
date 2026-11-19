import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { getHackathonLeaderboard, LEADERBOARD_CACHE_SECONDS } from "@/botcamp/lib/hackathon-leaderboard-data"
import { getRaceWindow, FINALS_SESSION_SELECT } from "@/botcamp/lib/hackathon-stages"
import { notFoundResponse, serverErrorResponse, successResponse } from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/hackathons/[slug]/leaderboard - Public live standings (issue #81)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true, slug: true, status: true, ...FINALS_SESSION_SELECT },
    })
    if (!hackathon || hackathon.status === "DRAFT") {
      return notFoundResponse("Hackathon not found")
    }

    const leaderboard = await getHackathonLeaderboard(
      hackathon.id,
      getRaceWindow(hackathon),
    )
    const response = successResponse(leaderboard)
    // Public and identical for every viewer, so let the CDN absorb polling —
    // but only for live standings. A degraded board (race feed stale or
    // Snapshot down) must not be cached and keep being served after it
    // recovers.
    response.headers.set(
      "Cache-Control",
      leaderboard.source === "live" && leaderboard.vote.status !== "unavailable"
        ? `public, s-maxage=${LEADERBOARD_CACHE_SECONDS}, stale-while-revalidate=${LEADERBOARD_CACHE_SECONDS * 4}`
        : "no-store",
    )
    return response
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return serverErrorResponse("Failed to fetch leaderboard")
  }
}
