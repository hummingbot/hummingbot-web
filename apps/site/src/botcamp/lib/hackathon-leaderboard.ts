import { SCORING_CRITERIA, type ScoringCriterionKey } from "@/botcamp/lib/hackathon-squads"

/**
 * Competition leaderboard domain model and scoring (issue #81).
 *
 * Pure — no I/O. The Condor client (src/lib/condor.ts) normalizes whatever
 * the Hummingbot API servers report into `AgentMetrics`; this module turns
 * those metrics into ranked agent and team standings. Keeping the two apart
 * means the scoring rules are testable without a running Condor instance.
 */

// Live performance for one racing agent, in quote currency (USD-equivalent).
export interface AgentMetrics {
  // RaceAgent id — the join key between Condor and the site's roster.
  agentId: string
  realizedPnlQuote: number
  unrealizedPnlQuote: number
  volumeQuote: number
  // Executors the agent has opened (each is a position/order lifecycle, not a
  // single fill — Hummingbot doesn't report a per-bot fill count).
  executorCount: number
  // Null when the upstream server doesn't report fees for this agent.
  feesQuote: number | null
  // Whether the agent's server answered on the last poll.
  online: boolean
  // When the upstream server last reported for this agent. Null if it never has.
  reportedAt: string | null
}

// Roster entry: one RaceAgent row (a deployed bot and the team it races for).
export interface RacingAgent {
  agentId: string
  teamId: string
}

export interface CriterionScore {
  key: ScoringCriterionKey
  weight: number
  // Competition rank within this criterion alone (1 = best; ties share).
  // Among agents for volume and P&L; among teams for the vote.
  rank: number
  // How many agents (or, for the vote, teams) `rank` is out of.
  outOf: number
  // Weighted points for this criterion, and the most it can award.
  points: number
  maxPoints: number
}

export interface AgentStanding {
  agentId: string
  teamId: string
  rank: number
  score: number
  breakdown: CriterionScore[]
  // Null when Condor had no data for this agent (not deployed, server down).
  metrics: AgentMetrics | null
  pnlQuote: number
  pnlPercent: number
}

export interface TeamStanding {
  teamId: string
  rank: number
  score: number
  agentIds: string[]
  // Unweighted HBOT vote points (2 × teams for first, down by 2 per place).
  votePoints: number
}

export interface LeaderboardInput {
  roster: RacingAgent[]
  metrics: AgentMetrics[]
  // HBOT Snapshot result per team id (any non-negative scale — the HBOT each
  // team received in the weighted vote). Voters back teams, not agents. Empty until a
  // proposal is linked, and until anyone votes every team scores 0 on it.
  teamVotes?: Record<string, number>
  startingCapitalQuote: number
}

export interface Leaderboard {
  agents: AgentStanding[]
  teams: TeamStanding[]
}

/**
 * Rank points for one criterion, per the published rules (hackathon FAQ, "How
 * are raw P&L, volume, and votes converted into points?"): agents are ranked
 * 1..n, the top agent earns n places and the lowest earns 1, and each place is
 * worth `perPlace` points (the criterion's multiplier, or the vote step).
 * Ties share the average of the positions they span, so equal values always
 * score equally.
 *
 * Rank-based rather than proportional is what the rules specify, and it also
 * keeps a single outlier (one bot doing 50x everyone's volume) from
 * flattening every other agent's volume score to ~0.
 *
 * A null value (no data for that agent) ranks below every real value, so a
 * bot that never reported can't outrank one that is genuinely losing.
 */
export function rankPoints(values: Array<number | null>, perPlace: number): number[] {
  const n = values.length
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => compareDesc(a.value, b.value))
  const points = new Array<number>(n)
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && order[j + 1].value === order[i].value) j++
    // Positions i..j (0 = best) tie; each gets the mean of their rank points.
    const meanPosition = (i + j) / 2
    const share = (n - meanPosition) * perPlace
    for (let k = i; k <= j; k++) points[order[k].index] = share
    i = j + 1
  }
  return points
}

/**
 * A score or points figure as shown: whole numbers as they are ("50"), since
 * rank points × the 2/2/1 multipliers are whole, and one decimal otherwise.
 */
export function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** CountUp's `decimals` for a score or points figure, matching formatPoints. */
export function pointsDecimals(value: number): number {
  return Number.isInteger(value) ? 0 : 1
}

// Vote points step per place: with 7 teams, first earns 14, then 12, … 2.
export const VOTE_POINTS_STEP = 2

/**
 * Unweighted vote points per team from the Snapshot result: teams are ranked
 * by vote, first earns VOTE_POINTS_STEP × team count and each place below
 * earns VOTE_POINTS_STEP less. Ties share the mean of the places they span.
 * Until anyone votes, every team holds 0 — the vote adds nothing to a score
 * it hasn't decided.
 */
export function teamVotePoints(teamIds: string[], teamVotes: Record<string, number>): Record<string, number> {
  const values = teamIds.map((id) => teamVotes[id] ?? 0)
  if (!values.some((v) => v > 0)) return Object.fromEntries(teamIds.map((id) => [id, 0]))
  const shares = rankPoints(values, VOTE_POINTS_STEP)
  return Object.fromEntries(teamIds.map((id, i) => [id, round(shares[i])]))
}

// Descending order with nulls (no data) last.
function compareDesc(a: number | null, b: number | null): number {
  if (a === null || b === null) return (a === null ? 1 : 0) - (b === null ? 1 : 0)
  return b - a
}

// Competition rank (1, 2, 2, 4) of each value, higher is better; nulls share last.
function competitionRanks(values: Array<number | null>): number[] {
  return values.map((v) => values.filter((other) => compareDesc(other, v) < 0).length + 1)
}

// Standard competition ranking (1, 2, 2, 4) over descending scores.
function assignRanks<T extends { score: number }>(items: T[]): Array<T & { rank: number }> {
  const sorted = [...items].sort((a, b) => b.score - a.score)
  return sorted.map((item, i) => {
    const firstTied = sorted.findIndex((other) => other.score === item.score)
    return { ...item, rank: firstTied === -1 ? i + 1 : firstTied + 1 }
  })
}

function round(value: number, digits = 2): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

export function computeLeaderboard(input: LeaderboardInput): Leaderboard {
  const { roster, teamVotes = {}, startingCapitalQuote } = input
  const metricsById = new Map(input.metrics.map((m) => [m.agentId, m]))

  // An agent with no data stays on the board but ranks last on volume and
  // P&L — below any real number, losses included — so a dead bot or a
  // mistyped server/bot name can't outrank an agent that is actually trading.
  // The vote comes from Snapshot, not Condor, so it's scored either way.
  //
  // An agent that hasn't traded (no volume, or no data) scores nothing at all:
  // it sits below every trading agent on P&L and volume and earns 0 on every
  // criterion, the vote included. Trading agents keep the points the full
  // field gives them, since they already rank above every idle one.
  const rows = roster.map((agent) => {
    const metrics = metricsById.get(agent.agentId) ?? null
    const idle = !metrics || metrics.volumeQuote === 0
    const pnlQuote = metrics ? metrics.realizedPnlQuote + metrics.unrealizedPnlQuote : null
    return { agent, metrics, idle, pnlQuote, volume: metrics?.volumeQuote ?? null }
  })

  // Voters back teams, and every agent on a team carries that team's vote
  // points as its vote criterion — so the team total counts them per agent.
  const teamIds = [...new Set(roster.map((a) => a.teamId))]
  const votePointsByTeam = teamVotePoints(teamIds, teamVotes)
  const voteRanks = competitionRanks(teamIds.map((id) => votePointsByTeam[id]))
  const teamVoteRank = new Map(teamIds.map((id, i) => [id, voteRanks[i]]))
  const maxVotePoints = VOTE_POINTS_STEP * teamIds.length

  const rankCriteria = SCORING_CRITERIA.filter((c) => c.key !== "vote")
  const valuesFor: Record<Exclude<ScoringCriterionKey, "vote">, Array<number | null>> = {
    volume: rows.map((r) => (r.idle ? null : r.volume)),
    pnl: rows.map((r) => (r.idle ? null : r.pnlQuote)),
  }
  const pointsFor = Object.fromEntries(
    rankCriteria.map((c) => [c.key, rankPoints(valuesFor[c.key as keyof typeof valuesFor], c.multiplier)]),
  ) as Record<ScoringCriterionKey, number[]>
  const ranksFor = Object.fromEntries(
    rankCriteria.map((c) => [c.key, competitionRanks(valuesFor[c.key as keyof typeof valuesFor])]),
  ) as Record<ScoringCriterionKey, number[]>

  const scored = rows.map((row, i) => {
    const breakdown: CriterionScore[] = SCORING_CRITERIA.map((c) =>
      c.key === "vote"
        ? {
            key: c.key,
            weight: c.weight,
            rank: teamVoteRank.get(row.agent.teamId)!,
            outOf: teamIds.length,
            points: row.idle ? 0 : round(votePointsByTeam[row.agent.teamId] * c.multiplier),
            maxPoints: round(maxVotePoints * c.multiplier),
          }
        : {
            key: c.key,
            weight: c.weight,
            rank: ranksFor[c.key][i],
            outOf: rows.length,
            points: row.idle ? 0 : round(pointsFor[c.key][i]),
            maxPoints: round(rows.length * c.multiplier),
          },
    )
    return {
      agentId: row.agent.agentId,
      teamId: row.agent.teamId,
      score: round(breakdown.reduce((sum, b) => sum + b.points, 0)),
      breakdown,
      metrics: row.metrics,
      pnlQuote: round(row.pnlQuote ?? 0),
      pnlPercent: startingCapitalQuote > 0 ? round(((row.pnlQuote ?? 0) / startingCapitalQuote) * 100) : 0,
    }
  })
  const agents: AgentStanding[] = assignRanks(scored)

  // A team's score is the sum of its agents' scores (SCORING_CRITERIA copy).
  const byTeam = new Map<string, { score: number; agentIds: string[] }>()
  for (const a of agents) {
    const team = byTeam.get(a.teamId) ?? { score: 0, agentIds: [] }
    team.score += a.score
    team.agentIds.push(a.agentId)
    byTeam.set(a.teamId, team)
  }
  const teams: TeamStanding[] = assignRanks(
    [...byTeam].map(([teamId, t]) => ({
      teamId,
      score: round(t.score),
      agentIds: t.agentIds,
      votePoints: votePointsByTeam[teamId],
    })),
  )

  return { agents, teams }
}

// ── Winnings ───────────────────────────────────────────────────────────────

// Prize money for 1st, 2nd and 3rd, in USD (hackathon FAQ, "What are the prizes?").
export const PODIUM_PRIZES = [5000, 2500, 1000]

/**
 * Each agent's prize money by final rank. Agents that tie share the prizes of
 * every place they span equally: two agents tied for 1st split 1st and 2nd,
 * three tied for 3rd split 3rd. Agents off the podium get nothing.
 */
export function podiumPrizes(standings: Array<{ agentId: string; rank: number }>): Record<string, number> {
  const tied = new Map<number, string[]>()
  for (const s of standings) tied.set(s.rank, [...(tied.get(s.rank) ?? []), s.agentId])
  const prizes: Record<string, number> = {}
  for (const [rank, ids] of tied) {
    const pool = PODIUM_PRIZES.slice(rank - 1, rank - 1 + ids.length).reduce((sum, p) => sum + p, 0)
    for (const id of ids) prizes[id] = round(pool / ids.length)
  }
  return prizes
}

// Honorable mention prize, in USD (hackathon FAQ, "What are the prizes?").
export const HONORABLE_MENTION_PRIZE = 100

// Honorable mentions by hackathon slug: the strategy slugs of the agents
// awarded one. Each takes HONORABLE_MENTION_PRIZE on top of its winnings.
export const HONORABLE_MENTIONS: Record<string, string[]> = {
  "agent-builders-cup-1": [
    "gateforum-multi-agent-research-decision-trader",
    "theta-covered-call-hedge-desk",
    "trend-aware-lp-rebalancer-agent",
  ],
}

// ── Race history (checkpoints) ─────────────────────────────────────────────

// Checkpoint hours for the race-history view: every 12h of the 48h finals
// (the last one must equal FINALS_DURATION_HOURS in hackathon-stages.ts).
// Each window covers a different mix of Asia / Europe / US sessions.
export const RACE_CHECKPOINT_HOURS = [12, 24, 36, 48]

// One sample of an agent's cumulative P&L and volume (Condor's history feed).
export interface MetricsPoint {
  timestamp: string
  pnlQuote: number
  volumeQuote: number
}

export interface Checkpoint {
  // Hours since the race started; 0 is the starting grid.
  hour: number
  label: string
  // True for the live "Now" point appended between checkpoints mid-race.
  isNow?: boolean
  // Unique running order at this checkpoint (1..n) — the bump chart's y.
  positions: Record<string, number>
  // Competition rank (ties share a rank) — what the leaderboard shows as "4".
  ranks: Record<string, number>
  // Each agent's cumulative numbers and score as of this checkpoint. Empty
  // at the grid, where everyone is at zero.
  stats: Record<string, { pnlQuote: number; volumeQuote: number; score: number }>
}

// Latest sample at or before `at` (epoch ms); null if the agent hadn't reported yet.
export function metricsAt(history: MetricsPoint[] | undefined, at: number): { pnl: number; volume: number } | null {
  let latest: MetricsPoint | null = null
  let best = -Infinity
  for (const p of history ?? []) {
    const t = Date.parse(p.timestamp)
    if (t <= at && t > best) {
      best = t
      latest = p
    }
  }
  return latest ? { pnl: latest.pnlQuote, volume: latest.volumeQuote } : null
}

/**
 * Standings at fixed checkpoints through the race, scored by the same rules
 * as the live board: at each checkpoint every agent's latest cumulative P&L
 * and volume go through computeLeaderboard. Hour 0 is the starting grid
 * (everyone is at zero, so rank there would be meaningless) — it uses
 * `gridOrder`, like an F1 lap chart. Checkpoints after `now` are omitted;
 * mid-race, a "Now" point scored at `now` is appended after the last one
 * reached, so the lines run up to the present.
 */
export function computeCheckpoints({
  roster,
  gridOrder,
  histories,
  raceStart,
  hours,
  now,
  startingCapitalQuote,
  teamVotes,
  includeNow = true,
}: {
  roster: RacingAgent[]
  // Agent ids in starting-grid order.
  gridOrder: string[]
  histories: Record<string, MetricsPoint[]>
  raceStart: Date
  // Checkpoint hours after the start, e.g. [12, 24, 36, 48].
  hours: number[]
  now: Date
  startingCapitalQuote: number
  // The current Snapshot result. There's no vote history, so every
  // checkpoint is scored with today's vote — matching the live board.
  teamVotes?: Record<string, number>
  // Append a "Now" point scored from the histories. Live callers pass false
  // and append withNowCheckpoint() from the live standings instead, so the
  // chart's Now always matches the leaderboard table exactly.
  includeNow?: boolean
}): Checkpoint[] {
  const grid: Checkpoint = {
    hour: 0,
    label: "Grid",
    positions: Object.fromEntries(gridOrder.map((id, i) => [id, i + 1])),
    ranks: Object.fromEntries(gridOrder.map((id, i) => [id, i + 1])),
    stats: {},
  }
  if (now < raceStart) return []

  const checkpoints = [grid]
  const last = hours[hours.length - 1]
  const elapsedHours = (now.getTime() - raceStart.getTime()) / 3_600_000

  const standingsAt = (hour: number) => {
    const at = raceStart.getTime() + hour * 3_600_000
    // An agent with no sample yet is left out, so it ranks last like on the live board.
    const metrics = roster.flatMap((a): AgentMetrics[] => {
      const m = metricsAt(histories[a.agentId], at)
      if (!m) return []
      return [
        {
          agentId: a.agentId,
          realizedPnlQuote: m.pnl,
          unrealizedPnlQuote: 0,
          volumeQuote: m.volume,
          executorCount: 0,
          feesQuote: null,
          online: true,
          reportedAt: null,
        },
      ]
    })
    return computeLeaderboard({ roster, metrics, startingCapitalQuote, teamVotes }).agents
  }
  const toCheckpoint = (hour: number, label: string, agents: AgentStanding[], isNow = false): Checkpoint => ({
      hour,
      label,
      ...(isNow ? { isNow } : {}),
      positions: Object.fromEntries(agents.map((a, i) => [a.agentId, i + 1])),
      ranks: Object.fromEntries(agents.map((a) => [a.agentId, a.rank])),
      stats: Object.fromEntries(
        agents.map((a) => [a.agentId, { pnlQuote: a.pnlQuote, volumeQuote: a.metrics?.volumeQuote ?? 0, score: a.score }]),
      ),
    })

  for (const hour of hours) {
    if (hour > elapsedHours) break
    checkpoints.push(toCheckpoint(hour, hour === last ? "Final" : `${hour}h`, standingsAt(hour)))
  }
  const lastReached = checkpoints[checkpoints.length - 1].hour
  if (includeNow && elapsedHours < last && elapsedHours > lastReached) {
    checkpoints.push(toCheckpoint(elapsedHours, "Now", standingsAt(elapsedHours), true))
  }
  return checkpoints
}

/**
 * Appends the live standings as the "Now" point, mid-race only (after the
 * grid, before the final checkpoint, and past the last one reached).
 */
export function withNowCheckpoint(
  checkpoints: Checkpoint[],
  standings: AgentStanding[],
  elapsedHours: number,
  raceHours: number,
): Checkpoint[] {
  const lastReached = checkpoints[checkpoints.length - 1]?.hour ?? 0
  if (checkpoints.length === 0 || elapsedHours >= raceHours || elapsedHours <= lastReached) return checkpoints
  return [
    ...checkpoints,
    {
      hour: elapsedHours,
      label: "Now",
      isNow: true,
      positions: Object.fromEntries(standings.map((a, i) => [a.agentId, i + 1])),
      ranks: Object.fromEntries(standings.map((a) => [a.agentId, a.rank])),
      stats: Object.fromEntries(
        standings.map((a) => [a.agentId, { pnlQuote: a.pnlQuote, volumeQuote: a.metrics?.volumeQuote ?? 0, score: a.score }]),
      ),
    },
  ]
}
