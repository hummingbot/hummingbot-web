import { prisma } from "@/botcamp/lib/prisma"
import { serverErrorResponse, successResponse } from "@/botcamp/lib/api-utils"
import { findRaceWindow, FINALS_SESSION_SELECT } from "@/botcamp/lib/hackathon-stages"

// GET /api/hackathons/active/summary - Just the latest hackathon's title, slug
// and finals window, for the site-wide announcement bar. /api/hackathons/active also
// resolves every team's seats, which the bar doesn't need on every page view.
// JUDGING and COMPLETED count too, so the bar can point to the results once
// the finals end, until the next hackathon opens.
export async function GET() {
  try {
    const hackathon = await prisma.hackathon.findFirst({
      where: { status: { not: "DRAFT" } },
      orderBy: { startDate: "desc" },
      select: { slug: true, title: true, ...FINALS_SESSION_SELECT },
    })
    // The bar counts down to the race, so an edition without a race date yet
    // (Coming Soon, early Registration) shows nothing.
    const finals = hackathon ? findRaceWindow(hackathon) : null
    if (!hackathon || !finals) return successResponse(null)
    const response = successResponse({
      slug: hackathon.slug,
      title: hackathon.title,
      finalsStart: finals.start.toISOString(),
      finalsEnd: finals.end.toISOString(),
    })
    // Identical for every visitor and rarely changes.
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600")
    return response
  } catch (error) {
    console.error("Error fetching hackathon summary:", error)
    return serverErrorResponse("Failed to fetch hackathon summary")
  }
}
