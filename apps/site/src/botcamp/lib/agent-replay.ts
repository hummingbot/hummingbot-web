// An agent's race as the agent page replays it (see AgentReplay).
export interface ReplayData {
  raceStart: string
  raceHours: number
  // How far the replay runs: the finish, or now while the race is on.
  endHour: number
  live: boolean
  // The agent's readings (5-minute steps), in hours since the start.
  series: { hour: number; pnl: number; volume: number }[]
  // Its rank and score through the race (half-hour steps, grid first).
  frames: { hour: number; rank: number; score: number }[]
  // Where it stands on the leaderboard: the replay ends exactly here.
  final: { rank: number; score: number; pnl: number; volume: number }
  fieldSize: number
  startingCapitalQuote: number
  checkpointHours: number[]
  color: string
}

/** Whether there's a race to replay: readings, and standings to place them in. */
export function isReplayable(data: ReplayData): boolean {
  return data.series.length > 1 && data.frames.length > 0
}
