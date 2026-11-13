import type { LeaderboardAgentRow } from "@/botcamp/lib/hackathon-leaderboard-data"

/**
 * The race's headline figures from the agents on the board: volume overall
 * and per agent, the best P&L, and who traded the most. Averages and the top
 * P&L count only agents that have traded, since idle ones aren't ranked.
 */
export function raceFigures(agents: LeaderboardAgentRow[]) {
  const traders = agents.filter((a) => (a.metrics?.volumeQuote ?? 0) > 0)
  const totalVolume = agents.reduce((sum, a) => sum + (a.metrics?.volumeQuote ?? 0), 0)
  const topPnl = traders.reduce<LeaderboardAgentRow | null>(
    (best, a) => (best === null || a.pnlPercent > best.pnlPercent ? a : best),
    null,
  )
  const maxVolume = Math.max(0, ...traders.map((a) => a.metrics!.volumeQuote))
  return {
    totalVolume,
    tradingAgents: traders.length,
    topPnl,
    maxVolume,
    // Everyone tied on the most volume.
    volumeLeaders: traders.filter((a) => a.metrics!.volumeQuote === maxVolume),
  }
}

/** "A", "A & B", "A, B & C": everyone who shares a place. */
export function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`
}

/**
 * 1st, 2nd and 3rd with everyone who finished there. Ranks are competition
 * ranks (1, 1, 3), so a tie for a place leaves the places it swallowed empty,
 * and a place nobody holds is left out.
 */
export function podiumPlaces<T extends { rank: number }>(agents: T[]): Array<{ place: 1 | 2 | 3; agents: T[] }> {
  return ([1, 2, 3] as const)
    .map((place) => ({ place, agents: agents.filter((a) => a.rank === place) }))
    .filter((p) => p.agents.length > 0)
}
