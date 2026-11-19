import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { getAgentHistory, LEADERBOARD_CACHE_SECONDS } from "@/botcamp/lib/hackathon-leaderboard-data"
import { getRaceWindow, FINALS_SESSION_SELECT } from "@/botcamp/lib/hackathon-stages"
import { notFoundResponse, serverErrorResponse, successResponse } from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string; agentSlug: string }>
}

// GET /api/hackathons/[slug]/agents/[agentSlug]/history - P&L/volume series
// for one racing agent since the finals began, for its detail-page chart.
// A Condor failure is an uncached 500, never an empty (cacheable) series.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, agentSlug } = await params
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true, slug: true, status: true, ...FINALS_SESSION_SELECT },
    })
    if (!hackathon || hackathon.status === "DRAFT") {
      return notFoundResponse("Hackathon not found")
    }

    const points = await getAgentHistory(
      hackathon.id,
      agentSlug,
      getRaceWindow(hackathon),
    )
    if (points === null) return notFoundResponse("Agent not found")

    const response = successResponse({ points })
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${LEADERBOARD_CACHE_SECONDS * 4}, stale-while-revalidate=${LEADERBOARD_CACHE_SECONDS * 8}`,
    )
    return response
  } catch (error) {
    console.error("Error fetching agent history:", error)
    return serverErrorResponse("Failed to fetch agent history")
  }
}
