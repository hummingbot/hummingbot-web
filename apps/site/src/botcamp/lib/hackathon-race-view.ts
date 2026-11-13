import {
  getCachedHackathonLeaderboard,
  getCachedLeaderboardHistory,
  type HackathonLeaderboard,
} from "@/botcamp/lib/hackathon-leaderboard-data"
import { withNowCheckpoint, type Checkpoint } from "@/botcamp/lib/hackathon-leaderboard"
import { raceDurationHours, type FinalsWindow } from "@/botcamp/lib/hackathon-stages"

/** Everything LeaderboardTable needs, loaded the same way on every surface. */
export interface RaceLeaderboardView {
  /** The race window the standings and history were loaded for. */
  window: FinalsWindow
  leaderboard: HackathonLeaderboard
  history: Checkpoint[]
  // Condor's history feed failed; the table flags it instead of hiding the tab.
  historyUnavailable: boolean
}

/**
 * Every selected agent, with Condor's metrics for the ones whose race bot is
 * registered. Race history is only loaded once the race is being scored.
 */
export async function loadRaceLeaderboard(
  hackathonId: string,
  finals: FinalsWindow,
): Promise<RaceLeaderboardView> {
  const leaderboard = await getCachedHackathonLeaderboard(hackathonId, finals.start.toISOString(), finals.end.toISOString())
  if (!leaderboard.scored) {
    return { window: finals, leaderboard, history: [], historyUnavailable: false }
  }

  try {
    const history = withNowCheckpoint(
      await getCachedLeaderboardHistory(
        hackathonId,
        finals.start.toISOString(),
        finals.end.toISOString(),
        leaderboard.teamVotes,
      ),
      leaderboard.agents,
      (Date.now() - finals.start.getTime()) / 3_600_000,
      raceDurationHours(finals),
    )
    return { window: finals, leaderboard, history, historyUnavailable: false }
  } catch (err) {
    // Flagged in the table rather than failing the whole page.
    console.error("Race history unavailable:", err)
    return { window: finals, leaderboard, history: [], historyUnavailable: true }
  }
}
