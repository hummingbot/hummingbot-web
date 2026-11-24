import { prisma } from "@/botcamp/lib/prisma"
import { findRaceWindow } from "@/botcamp/lib/hackathon-stages"
import { getCachedHackathonLeaderboard } from "@/botcamp/lib/hackathon-leaderboard-data"
import { HONORABLE_MENTIONS, podiumPrizes } from "@/botcamp/lib/hackathon-leaderboard"

/** A strategy's final standing in a hackathon showcased on /strategies. */
export interface StrategyShowcase {
  rank: number
  /** Podium prize money, e.g. "$5,000"; null off the podium. */
  prize: string | null
  honorableMention: boolean
  hackathon: { slug: string; title: string }
}

// Final standings an admin chose to pin to the top of the list (the
// "Showcase results on /strategies" toggle in the hackathon editor), keyed by
// strategy slug. Read from the same scored leaderboard as the hackathon's
// Final Standings, so ranks, podium prizes and honorable mentions match it.
// A race that isn't over or scored yet contributes nothing, and a leaderboard
// that fails to load drops the block instead of failing the page.
export async function getStrategyShowcase(now: Date = new Date()): Promise<Map<string, StrategyShowcase>> {
  const showcase = new Map<string, StrategyShowcase>()
  const hackathons = await prisma.hackathon.findMany({
    where: { showcaseOnStrategies: true },
    select: {
      id: true,
      slug: true,
      title: true,
      raceStart: true,
      raceEnd: true,
      sessions: { select: { slug: true, date: true } },
    },
  })

  for (const hackathon of hackathons) {
    const finals = findRaceWindow(hackathon)
    if (!finals || finals.end > now) continue
    try {
      const board = await getCachedHackathonLeaderboard(
        hackathon.id,
        finals.start.toISOString(),
        finals.end.toISOString(),
      )
      if (!board.scored) continue
      const prizes = podiumPrizes(board.agents)
      const honorable = new Set(HONORABLE_MENTIONS[hackathon.slug] ?? [])
      for (const agent of board.agents) {
        // An agent racing in two showcased editions keeps its best finish.
        const current = showcase.get(agent.slug)
        if (current && current.rank <= agent.rank) continue
        const prize = prizes[agent.agentId]
        showcase.set(agent.slug, {
          rank: agent.rank,
          prize: prize ? `$${prize.toLocaleString("en-US")}` : null,
          honorableMention: honorable.has(agent.slug),
          hackathon: { slug: hackathon.slug, title: hackathon.title },
        })
      }
    } catch (error) {
      console.error(`Showcase standings unavailable for ${hackathon.slug}:`, error)
    }
  }
  return showcase
}
