import { prisma } from "@/botcamp/lib/prisma"
import { getHackathonSquads } from "@/botcamp/lib/hackathon-data"
import { CURRENT_HACKATHON_STATUSES, FINALS_SESSION_SELECT, findRaceWindow } from "@/botcamp/lib/hackathon-stages"
import type { TeamSponsorCard } from "@/botcamp/components/hackathons/TeamSponsorsGrid"

/** The hackathon the home page features, as its Hackathon section reads it. */
export interface ActiveHackathon {
  slug: string
  title: string
  description: string | null
  status: string
  registrationEnd: string | null
  startDate: string
  endDate: string
  prizePool: number
  slotsPerSquad: number
  // When the race finishes: the home page shows the final standings after.
  // Null while no race date is set (Coming Soon, Open).
  finalsEnd: string | null
  teams: TeamSponsorCard[]
}

/** Sum of the prizes' amounts ("$1,000" → 1000), skipping any that don't parse. */
function prizePoolOf(prizes: unknown): number {
  if (!Array.isArray(prizes)) return 0
  return (prizes as Array<{ amount?: string }>).reduce((sum, prize) => {
    if (!prize.amount) return sum
    const amount = parseFloat(prize.amount.replace(/[^0-9.]/g, ""))
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
}

/**
 * The current hackathon (earliest-starting in a current stage), or null when
 * there's none. Shared by the home page, which renders it on the server, and
 * GET /api/hackathons/active.
 */
export async function getActiveHackathon(): Promise<ActiveHackathon | null> {
  const hackathon = await prisma.hackathon.findFirst({
    where: { status: { in: CURRENT_HACKATHON_STATUSES } },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      registrationEnd: true,
      startDate: true,
      endDate: true,
      prizes: true,
      teamIds: true,
      maxSelections: true,
      ...FINALS_SESSION_SELECT,
    },
  })
  if (!hackathon) return null

  const teams = await getHackathonSquads(hackathon.id, hackathon.teamIds, hackathon.maxSelections)

  return {
    slug: hackathon.slug,
    title: hackathon.title,
    description: hackathon.description,
    status: hackathon.status,
    registrationEnd: hackathon.registrationEnd?.toISOString() ?? null,
    startDate: hackathon.startDate.toISOString(),
    endDate: hackathon.endDate.toISOString(),
    prizePool: prizePoolOf(hackathon.prizes),
    slotsPerSquad: hackathon.maxSelections,
    finalsEnd: findRaceWindow(hackathon)?.end.toISOString() ?? null,
    teams,
  }
}
