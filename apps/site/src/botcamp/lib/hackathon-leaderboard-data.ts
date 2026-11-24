import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/botcamp/lib/prisma"
import {
  RACE_CHECKPOINT_HOURS,
  computeCheckpoints,
  computeLeaderboard,
  type AgentMetrics,
  type AgentStanding,
  type Checkpoint,
  type MetricsPoint,
  type TeamStanding,
} from "@/botcamp/lib/hackathon-leaderboard"
import { STARTING_CAPITAL_QUOTE } from "@/botcamp/lib/hackathon-squads"
import { finalsWindow, raceDurationHours, type FinalsWindow } from "@/botcamp/lib/hackathon-stages"
import {
  SNAPSHOT_CACHE_SECONDS,
  SnapshotError,
  fetchSnapshotProposal,
  matchTeamsToChoices,
  snapshotProposalUrl,
} from "@/botcamp/lib/snapshot"

/**
 * Leaderboard data for one hackathon: every selected application (the
 * starting grid), joined with the latest reading the Condor routine pushed for
 * it (RaceMetric, see src/lib/race-feed.ts), scored by computeLeaderboard.
 *
 * Only readings inside the finals window (FinalsWindow, from the hackathon's
 * "finals" session) are scored: test readings sent before the start never
 * count, and once the race is over the board shows each agent as it stood at
 * the finish, whatever arrives later.
 *
 * `source` tells the UI how far to trust the numbers:
 *   - "live"         Readings are arriving (the newest is under STALE_AFTER_MS
 *                    old), or the race is over and readings exist.
 *   - "unavailable"  The race is on but no reading has arrived recently (or
 *                    at all) — the UI flags the standings as not current and
 *                    the public API must not let a CDN cache them.
 *   - "seats"        No reading has ever arrived.
 *
 * `scored` is false until there's a race to rank: before finals.start, or with
 * no reading yet. The agents are then listed at zero with no podium — scored
 * only by the HBOT vote; ties keep grid order.
 */
export type LeaderboardSource = "live" | "unavailable" | "seats"

// An agent (or the whole feed) with no reading for this long counts as down.
export const STALE_AFTER_MS = 5 * 60_000

// How long the public leaderboard / history APIs may be cached by the CDN
// while the data is live. Readings arrive about once a minute.
export const LEADERBOARD_CACHE_SECONDS = 15

export interface LeaderboardAgentRow extends AgentStanding {
  // The strategy's slug: the URL key for /hackathons/[slug]/agents/[agentSlug]
  // once the agent is reporting, and for /strategies/[slug] before that.
  slug: string
  strategyTitle: string
  driver: { name: string; avatarUrl: string | null } | null
  // Whether any reading has arrived for this agent. Only reporting agents
  // have an agent page.
  reporting: boolean
}

/**
 * The HBOT Snapshot vote behind the vote criterion:
 *   - "none"         No proposal linked yet; the vote adds 0 to every score.
 *   - "live"         A proposal is linked. Its running tally is scored as
 *                    votes land, and becomes final when the proposal closes.
 *                    Until anyone votes, every team holds 0 vote points.
 *   - "unavailable"  A proposal is linked but couldn't be read or doesn't
 *                    match the teams; the vote adds 0 and the UI says so.
 */
export type HackathonVote =
  | { status: "none" }
  | {
      status: "live"
      url: string
      state: "pending" | "active" | "closed"
      start: string
      end: string
      votes: number
      scoresTotal: number
    }
  | { status: "unavailable"; url: string }

export interface HackathonLeaderboard {
  source: LeaderboardSource
  scored: boolean
  generatedAt: string | null
  agents: LeaderboardAgentRow[]
  teams: TeamStanding[]
  vote: HackathonVote
  // Snapshot tally per team id (HBOT received) that the standings were
  // scored with, so race history can be scored the same way.
  teamVotes: Record<string, number>
}

const getCachedProposal = unstable_cache(
  async (proposalId: string) => {
    const p = await fetchSnapshotProposal(proposalId)
    // unstable_cache serializes to JSON; keep dates as strings across it.
    return { ...p, start: p.start.toISOString(), end: p.end.toISOString() }
  },
  ["snapshot-proposal"],
  { revalidate: SNAPSHOT_CACHE_SECONDS },
)

async function getHackathonVote(
  hackathonId: string,
): Promise<{ vote: HackathonVote; teamVotes: Record<string, number> }> {
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { snapshotProposalId: true, teamIds: true },
  })
  const proposalId = hackathon?.snapshotProposalId
  if (!proposalId) return { vote: { status: "none" }, teamVotes: {} }

  const url = snapshotProposalUrl(proposalId)
  try {
    const [cached, teams] = await Promise.all([
      getCachedProposal(proposalId),
      prisma.team.findMany({ where: { id: { in: hackathon.teamIds } }, select: { id: true, name: true } }),
    ])
    const proposal = { ...cached, start: new Date(cached.start), end: new Date(cached.end) }
    // Matched while voting is open too, so a proposal that doesn't fit the
    // teams shows as unavailable straight away rather than at the close.
    const result = matchTeamsToChoices(proposal, teams)
    return {
      vote: {
        status: "live",
        url,
        state: proposal.state,
        start: cached.start,
        end: cached.end,
        votes: proposal.votes,
        scoresTotal: proposal.scoresTotal,
      },
      // The running tally moves the standings as votes land; it is final
      // once the proposal closes.
      teamVotes: result,
    }
  } catch (err) {
    console.error(`Snapshot vote ${proposalId} unavailable:`, err instanceof SnapshotError ? err.message : err)
    return { vote: { status: "unavailable", url }, teamVotes: {} }
  }
}

function driverName(user: { name: string | null; firstName: string | null; lastName: string | null }): string {
  const composed = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
  return composed || user.name || "Agent Driver"
}

interface RosterEntry {
  // The Application id: stable from selection through the whole race.
  agentId: string
  teamId: string
  driver: { name: string; avatarUrl: string | null }
  strategy: { slug: string; title: string } | null
}

/**
 * The starting grid: every application selected by one of this hackathon's
 * teams, in a stable order — team order, then selection seniority, with the
 * id as the final tie-break so racing numbers never swap between loads.
 */
// cache(): the live board, the history and an agent page all read the
// roster, and one request should load it once.
const getRaceRoster = cache(async (hackathonId: string): Promise<RosterEntry[]> => {
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { teamIds: true },
  })
  if (!hackathon || hackathon.teamIds.length === 0) return []

  const applications = await prisma.application.findMany({
    where: { hackathonId, selectedTeamId: { in: hackathon.teamIds } },
    select: {
      id: true,
      selectedTeamId: true,
      user: { select: { name: true, firstName: true, lastName: true, avatarUrl: true } },
      strategy: { select: { slug: true, title: true } },
    },
    orderBy: [{ selectedTeam: { sortOrder: "asc" } }, { createdAt: "asc" }, { id: "asc" }],
  })

  return applications.map((app) => ({
    agentId: app.id,
    teamId: app.selectedTeamId!,
    driver: { name: driverName(app.user), avatarUrl: app.user.avatarUrl },
    strategy: app.strategy,
  }))
})

interface Reading {
  applicationId: string
  timestamp: Date
  pnlQuote: number
  volumeQuote: number
}

// Each agent's latest reading at or before `at`, and from `from` on if given.
// DISTINCT ON in SQL: Prisma's `distinct` reads every row in the window and
// de-duplicates in the client, which grows with the race (one reading per
// agent per minute) for an answer of one row per agent.
async function latestReadings(hackathonId: string, from: Date | null, at: Date): Promise<Reading[]> {
  return prisma.$queryRaw<Reading[]>`
    SELECT DISTINCT ON ("applicationId") "applicationId", "timestamp", "pnlQuote", "volumeQuote"
    FROM race_metrics
    WHERE "hackathonId" = ${hackathonId} AND "timestamp" >= ${from ?? new Date(0)} AND "timestamp" <= ${at}
    ORDER BY "applicationId", "timestamp" DESC`
}

const ZERO_METRICS: Omit<AgentMetrics, "agentId"> = {
  realizedPnlQuote: 0,
  unrealizedPnlQuote: 0,
  volumeQuote: 0,
  executorCount: 0,
  feesQuote: null,
  online: false,
  reportedAt: null,
}

function toRow(standing: AgentStanding, entry: RosterEntry, reporting: boolean): LeaderboardAgentRow {
  return {
    ...standing,
    slug: entry.strategy?.slug ?? "",
    strategyTitle: entry.strategy?.title ?? entry.driver.name,
    driver: entry.driver,
    reporting,
  }
}

// Before there's a race to rank: every agent at zero, scored by the same rules
// (so they tie on P&L and volume and only the vote separates them). Positions
// are a unique running order — ties keep grid order — since a board where
// every agent reads "1" says nothing.
function unscoredBoard(
  roster: RosterEntry[],
  source: LeaderboardSource,
  reportingIds: Set<string>,
  teamVotes: Record<string, number>,
): Omit<HackathonLeaderboard, "vote"> {
  const scored = computeLeaderboard({
    roster: roster.map((r) => ({ agentId: r.agentId, teamId: r.teamId })),
    metrics: roster.map((r) => ({ agentId: r.agentId, ...ZERO_METRICS })),
    teamVotes,
    startingCapitalQuote: STARTING_CAPITAL_QUOTE,
  })
  const gridIndex = new Map(roster.map((r, i) => [r.agentId, i]))
  const rosterById = new Map(roster.map((r) => [r.agentId, r]))
  const agents = [...scored.agents]
    .sort((a, b) => b.score - a.score || gridIndex.get(a.agentId)! - gridIndex.get(b.agentId)!)
    .map((standing, i) =>
      toRow({ ...standing, rank: i + 1 }, rosterById.get(standing.agentId)!, reportingIds.has(standing.agentId)),
    )
  const teamOrder = [...new Set(roster.map((r) => r.teamId))]
  const teams = [...scored.teams]
    .sort((a, b) => b.score - a.score || teamOrder.indexOf(a.teamId) - teamOrder.indexOf(b.teamId))
    .map((t, i) => ({ ...t, rank: i + 1 }))
  return { source, scored: false, generatedAt: null, agents, teams, teamVotes }
}

export async function getHackathonLeaderboard(
  hackathonId: string,
  finals: FinalsWindow,
  now: Date = new Date(),
): Promise<HackathonLeaderboard> {
  const [roster, { vote, teamVotes }] = await Promise.all([getRaceRoster(hackathonId), getHackathonVote(hackathonId)])
  const raceOver = now >= finals.end
  // Before the start, any reading shows the feed is working; once the race is
  // on, only readings from the start count, so earlier tests never score.
  const raceStarted = now >= finals.start
  const readings = await latestReadings(hackathonId, raceStarted ? finals.start : null, raceOver ? finals.end : now)
  const rosterIds = new Set(roster.map((r) => r.agentId))
  const byAgent = new Map(readings.filter((r) => rosterIds.has(r.applicationId)).map((r) => [r.applicationId, r]))
  const reportingIds = new Set(byAgent.keys())

  const newest = Math.max(0, ...[...byAgent.values()].map((r) => r.timestamp.getTime()))
  const fresh = (ms: number) => raceOver || now.getTime() - ms <= STALE_AFTER_MS
  const source: LeaderboardSource = byAgent.size === 0 ? "seats" : fresh(newest) ? "live" : "unavailable"

  // No P&L or volume is ranked before the start.
  if (!raceStarted) return { ...unscoredBoard(roster, source, reportingIds, teamVotes), vote }
  // The race is on but nothing has ever arrived: the feed is down.
  if (byAgent.size === 0) {
    return roster.length === 0
      ? { ...unscoredBoard(roster, "seats", reportingIds, teamVotes), vote }
      : { ...scoredBoard(roster, byAgent, now, raceOver, teamVotes), vote, source: "unavailable", generatedAt: null }
  }

  return {
    ...scoredBoard(roster, byAgent, now, raceOver, teamVotes),
    vote,
    source,
    generatedAt: new Date(newest).toISOString(),
  }
}

function scoredBoard(
  roster: RosterEntry[],
  byAgent: Map<string, Reading>,
  now: Date,
  raceOver: boolean,
  teamVotes: Record<string, number>,
): Omit<HackathonLeaderboard, "source" | "generatedAt" | "vote"> {
  const metrics: AgentMetrics[] = [...byAgent.values()].map((r) => ({
    agentId: r.applicationId,
    realizedPnlQuote: r.pnlQuote,
    unrealizedPnlQuote: 0,
    volumeQuote: r.volumeQuote,
    executorCount: 0,
    feesQuote: null,
    // An agent whose readings stopped mid-race shows as offline.
    online: raceOver || now.getTime() - r.timestamp.getTime() <= STALE_AFTER_MS,
    reportedAt: r.timestamp.toISOString(),
  }))
  const { agents, teams } = computeLeaderboard({
    roster: roster.map((r) => ({ agentId: r.agentId, teamId: r.teamId })),
    metrics,
    teamVotes,
    startingCapitalQuote: STARTING_CAPITAL_QUOTE,
  })
  const rosterById = new Map(roster.map((r) => [r.agentId, r]))
  return {
    scored: true,
    agents: agents.map((standing) =>
      toRow(standing, rosterById.get(standing.agentId)!, byAgent.has(standing.agentId)),
    ),
    teams,
    teamVotes,
  }
}

/**
 * One agent's P&L / volume readings from the race start to the finish, for
 * its detail page. Null when the slug isn't a selected agent in this hackathon.
 */
export async function getAgentHistory(
  hackathonId: string,
  agentSlug: string,
  finals: FinalsWindow,
): Promise<MetricsPoint[] | null> {
  const entry = (await getRaceRoster(hackathonId)).find((r) => r.strategy?.slug === agentSlug)
  if (!entry) return null

  const rows = await prisma.raceMetric.findMany({
    where: { applicationId: entry.agentId, timestamp: { gte: finals.start, lte: finals.end } },
    orderBy: { timestamp: "asc" },
    select: { timestamp: true, pnlQuote: true, volumeQuote: true },
  })
  return thinSeries(rows).map((r) => ({
    timestamp: r.timestamp.toISOString(),
    pnlQuote: r.pnlQuote,
    volumeQuote: r.volumeQuote,
  }))
}

// One point per SERIES_STEP_MS is plenty for a 48-hour chart; every
// per-minute reading would be ~2,900 points, sent twice (HTML and RSC payload).
const SERIES_STEP_MS = 5 * 60_000

// The last reading in each step, plus the latest, so the line ends where the
// standings are.
function thinSeries<T extends { timestamp: Date }>(rows: T[]): T[] {
  const bucket = (r: T) => Math.floor(r.timestamp.getTime() / SERIES_STEP_MS)
  return rows.filter((r, i) => i === rows.length - 1 || bucket(r) !== bucket(rows[i + 1]))
}

// The pages share one computed board, history and agent series per
// LEADERBOARD_CACHE_SECONDS across all visitors, instead of rebuilding them on
// every request. The finals window is passed as its start (it is derived from
// it), so the cache key is plain strings.
// The cache key carries the race's start and end as ISO strings — a Date
// doesn't survive unstable_cache's key — so an edited Race End re-keys too.
const windowOf = (finalsStart: string, finalsEnd: string): FinalsWindow => ({
  ...finalsWindow(new Date(finalsStart)),
  end: new Date(finalsEnd),
})

export const getCachedHackathonLeaderboard = unstable_cache(
  (hackathonId: string, finalsStart: string, finalsEnd: string) =>
    getHackathonLeaderboard(hackathonId, windowOf(finalsStart, finalsEnd)),
  ["hackathon-leaderboard"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)

export const getCachedLeaderboardHistory = unstable_cache(
  (hackathonId: string, finalsStart: string, finalsEnd: string, teamVotes: Record<string, number>) =>
    getLeaderboardHistory(hackathonId, windowOf(finalsStart, finalsEnd), teamVotes),
  ["hackathon-leaderboard-history"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)

export const getCachedAgentHistory = unstable_cache(
  (hackathonId: string, agentSlug: string, finalsStart: string, finalsEnd: string) =>
    getAgentHistory(hackathonId, agentSlug, windowOf(finalsStart, finalsEnd)),
  ["hackathon-agent-history"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)

/**
 * Standings at each checkpoint reached so far (plus the starting grid). Only
 * each agent's latest reading at each checkpoint is read — at most one query
 * per checkpoint — which is all computeCheckpoints needs. Empty before the
 * race starts or with no reading yet.
 */
export async function getLeaderboardHistory(
  hackathonId: string,
  finals: FinalsWindow,
  // The live board's Snapshot result (HackathonLeaderboard.teamVotes).
  teamVotes: Record<string, number>,
  now: Date = new Date(),
): Promise<Checkpoint[]> {
  const raceStart = finals.start
  if (now < raceStart) return []
  const roster = await getRaceRoster(hackathonId)
  if (roster.length === 0) return []

  const elapsedHours = (now.getTime() - raceStart.getTime()) / 3_600_000
  const reached = RACE_CHECKPOINT_HOURS.filter((h) => h <= elapsedHours)
  const atCheckpoints = await Promise.all(
    reached.map((hour) => latestReadings(hackathonId, raceStart, new Date(raceStart.getTime() + hour * 3_600_000))),
  )
  // In checkpoint order, so each agent's history stays sorted by time.
  const histories: Record<string, MetricsPoint[]> = {}
  for (const rows of atCheckpoints) {
    for (const r of rows) {
      ;(histories[r.applicationId] ??= []).push({
        timestamp: r.timestamp.toISOString(),
        pnlQuote: r.pnlQuote,
        volumeQuote: r.volumeQuote,
      })
    }
  }

  return computeCheckpoints({
    roster: roster.map((r) => ({ agentId: r.agentId, teamId: r.teamId })),
    // Starting grid follows the same team / seat order as everywhere else.
    gridOrder: roster.map((r) => r.agentId),
    histories,
    raceStart,
    hours: RACE_CHECKPOINT_HOURS,
    now,
    startingCapitalQuote: STARTING_CAPITAL_QUOTE,
    teamVotes,
    // The page appends Now from the live standings (withNowCheckpoint), so
    // it matches the table.
    includeNow: false,
  })
}

// The replay's resolution: standings every half hour of the race.
const REPLAY_STEP_MINUTES = 30

/** One agent's place in the field at a moment of the race. */
export interface ReplayFrame {
  hour: number
  rank: number
  // Unique running order (1..n), ties broken as on the history chart.
  position: number
  score: number
  pnlQuote: number
  volumeQuote: number
}

/**
 * Every agent's rank and score through the race, every REPLAY_STEP_MINUTES,
 * for replaying an agent's race on its page. Scored the same way as the
 * checkpoints (today's vote throughout). Up to now while the race runs.
 * Keyed by agent id; the first frame is the starting grid.
 */
export async function getRaceReplay(
  hackathonId: string,
  finals: FinalsWindow,
  teamVotes: Record<string, number>,
  now: Date = new Date(),
): Promise<Record<string, ReplayFrame[]>> {
  if (now < finals.start) return {}
  const roster = await getRaceRoster(hackathonId)
  if (roster.length === 0) return {}

  // Each agent's last reading in each step: what the standings at a step's
  // end are scored from.
  const stepSeconds = REPLAY_STEP_MINUTES * 60
  const rows = await prisma.$queryRaw<Reading[]>`
    SELECT DISTINCT ON ("applicationId", step) "applicationId", "timestamp", "pnlQuote", "volumeQuote"
    FROM (
      SELECT *, floor(extract(epoch from "timestamp") / ${stepSeconds}) AS step
      FROM race_metrics
      WHERE "hackathonId" = ${hackathonId} AND "timestamp" >= ${finals.start} AND "timestamp" <= ${finals.end}
    ) readings
    ORDER BY "applicationId", step, "timestamp" DESC`
  const histories: Record<string, MetricsPoint[]> = {}
  for (const r of rows) {
    ;(histories[r.applicationId] ??= []).push({
      timestamp: r.timestamp.toISOString(),
      pnlQuote: r.pnlQuote,
      volumeQuote: r.volumeQuote,
    })
  }

  const raceHours = raceDurationHours(finals)
  const steps = Math.round((raceHours * 60) / REPLAY_STEP_MINUTES)
  const checkpoints = computeCheckpoints({
    roster: roster.map((r) => ({ agentId: r.agentId, teamId: r.teamId })),
    gridOrder: roster.map((r) => r.agentId),
    histories,
    raceStart: finals.start,
    hours: Array.from({ length: steps }, (_, i) => ((i + 1) * REPLAY_STEP_MINUTES) / 60),
    now: now < finals.end ? now : finals.end,
    startingCapitalQuote: STARTING_CAPITAL_QUOTE,
    teamVotes,
  })

  const frames: Record<string, ReplayFrame[]> = {}
  for (const cp of checkpoints) {
    for (const [agentId, rank] of Object.entries(cp.ranks)) {
      const stats = cp.stats[agentId]
      ;(frames[agentId] ??= []).push({
        hour: cp.hour,
        rank,
        position: cp.positions[agentId],
        // None at the grid, before anyone has traded.
        score: stats?.score ?? 0,
        pnlQuote: stats?.pnlQuote ?? 0,
        volumeQuote: stats?.volumeQuote ?? 0,
      })
    }
  }
  return frames
}

export const getCachedRaceReplay = unstable_cache(
  (hackathonId: string, finalsStart: string, finalsEnd: string, teamVotes: Record<string, number>) =>
    getRaceReplay(hackathonId, windowOf(finalsStart, finalsEnd), teamVotes),
  ["hackathon-race-replay"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)
