import { cache } from "react"
import { unstable_cache } from "next/cache"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { AgentReplayProvider, ReplayPanel, ReplayStats } from "@/botcamp/components/hackathons/AgentReplay"
import { isReplayable, type ReplayData } from "@/botcamp/lib/agent-replay"
import { AgentStickyBar } from "@/botcamp/components/hackathons/AgentStickyBar"
import { RaceBackdrop } from "@/botcamp/components/hackathons/RaceBackdrop"
import { AgentExecuted, AgentTraded } from "@/botcamp/components/hackathons/AgentFleetDetail"
import { Eyebrow, SectionTitle } from "@/botcamp/components/hackathons/AgentSectionTitle"
import { BuilderCard } from "@/botcamp/components/hackathons/BuilderCard"
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react"
import {
  getCachedAgentHistory,
  getCachedHackathonLeaderboard,
  getCachedLeaderboardHistory,
  getCachedRaceReplay,
  LEADERBOARD_CACHE_SECONDS,
  type HackathonLeaderboard,
  type ReplayFrame,
} from "@/botcamp/lib/hackathon-leaderboard-data"
import {
  RACE_CHECKPOINT_HOURS,
  VOTE_POINTS_STEP,
  formatPoints,
  withNowCheckpoint,
  type Checkpoint,
  type MetricsPoint,
} from "@/botcamp/lib/hackathon-leaderboard"
import {
  raceDurationHours,
  findRaceWindow,
  FINALS_SESSION_SELECT,
  type FinalsWindow,
} from "@/botcamp/lib/hackathon-stages"
import {
  DEFAULT_PRIMARY_COLOR,
  SCORING_CRITERIA,
  STARTING_CAPITAL_QUOTE,
} from "@/botcamp/lib/hackathon-squads"
import { GAIN_COLOR, LOSS_COLOR } from "@/botcamp/lib/design-constants"
import type { FleetDetail } from "@/botcamp/lib/hackathon-fleet-detail"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string; agentSlug: string }>
}

const STRATEGY_TYPE_LABELS: Record<string, string> = {
  AGENT: "Condor Agent",
  CONTROLLER: "Hummingbot V2 Controller",
  SCRIPT: "Hummingbot Script",
  V1_STRATEGY: "Hummingbot V1 Strategy",
  OTHER: "Other",
}

// The hackathon, team and strategy rows behind an agent page, shared across
// requests like the leaderboard: an admin edit shows within
// LEADERBOARD_CACHE_SECONDS. The cache stores JSON, so dates leave as ISO strings.
const loadHackathon = unstable_cache(
  async (slug: string) => {
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true, slug: true, title: true, status: true, teamIds: true, ...FINALS_SESSION_SELECT },
    })
    if (!hackathon || hackathon.status === "DRAFT") return null
    return {
      ...hackathon,
      sessions: hackathon.sessions.map((s) => ({ slug: s.slug, date: s.date?.toISOString() ?? null })),
    }
  },
  ["agent-page-hackathon"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)

const loadTeam = unstable_cache(
  (teamId: string) =>
    prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, slug: true, name: true, logoUrl: true, logoUrlDark: true, primaryColor: true },
    }),
  ["agent-page-team"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)

const loadStrategy = unstable_cache(
  (agentSlug: string) =>
    prisma.strategy.findUnique({
      where: { slug: agentSlug },
      select: { slug: true, title: true, summary: true, strategyType: true },
    }),
  ["agent-page-strategy"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)

// The builder behind the agent: what their profile card shows.
const loadBuilder = unstable_cache(
  async (applicationId: string) => {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { user: { select: { slug: true, tagline: true, location: true, profileVisibility: true } } },
    })
    if (!app) throw new Error(`Application ${applicationId} not found for its agent page`)
    return app.user
  },
  ["agent-page-builder"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)

// What the agent traded and how it executed, from the fleet backup. Null for
// the agents the backup has no record of.
const loadFleetDetail = unstable_cache(
  async (applicationId: string): Promise<FleetDetail | null> => {
    const row = await prisma.raceAgentDetail.findUnique({ where: { applicationId }, select: { data: true } })
    return row ? (row.data as unknown as FleetDetail) : null
  },
  ["agent-page-fleet-detail"],
  { revalidate: LEADERBOARD_CACHE_SECONDS },
)

// History: standings at each checkpoint, plus this agent's own P&L/volume
// path. Null when the history couldn't be read — the page says so rather than
// dropping the section.
async function loadHistory(
  hackathonId: string,
  agentSlug: string,
  finals: FinalsWindow,
  live: HackathonLeaderboard,
  agentId: string,
): Promise<{
  checkpoints: Checkpoint[]
  series: { raceStart: Date; points: MetricsPoint[] } | null
  frames: ReplayFrame[]
} | null> {
  try {
    const start = finals.start.toISOString()
    const end = finals.end.toISOString()
    const [raceHistory, points, replay] = await Promise.all([
      getCachedLeaderboardHistory(hackathonId, start, end, live.teamVotes),
      getCachedAgentHistory(hackathonId, agentSlug, start, end),
      getCachedRaceReplay(hackathonId, start, end, live.teamVotes),
    ])
    return {
      checkpoints: withNowCheckpoint(
        raceHistory,
        live.agents,
        (Date.now() - finals.start.getTime()) / 3_600_000,
        raceDurationHours(finals),
      ),
      series: points ? { raceStart: finals.start, points } : null,
      frames: replay[agentId] ?? [],
    }
  } catch (err) {
    console.error("Agent race history unavailable:", err)
    return null
  }
}

// cache() so generateMetadata and the page share one set of queries per request.
const getData = cache(async (slug: string, agentSlug: string) => {
  const hackathon = await loadHackathon(slug)
  if (!hackathon) return null
  const finals = findRaceWindow({
    ...hackathon,
    sessions: hackathon.sessions.map((s) => ({ slug: s.slug, date: s.date ? new Date(s.date) : null })),
  })
  // No race window yet means no race, so no agent page.
  if (!finals) return null

  // Same source as the leaderboard: an agent page exists only for a selected
  // agent the race feed has reported on.
  const [live, strategy] = await Promise.all([
    getCachedHackathonLeaderboard(hackathon.id, finals.start.toISOString(), finals.end.toISOString()),
    loadStrategy(agentSlug),
  ])
  const agent = live.agents.find((a) => a.slug === agentSlug && a.reporting)
  if (!agent) return null

  // Nothing to chart before the race is being scored.
  const [team, history, fleetDetail, builder] = await Promise.all([
    loadTeam(agent.teamId),
    live.scored ? loadHistory(hackathon.id, agentSlug, finals, live, agent.agentId) : { checkpoints: [], series: null, frames: [] },
    loadFleetDetail(agent.agentId),
    loadBuilder(agent.agentId),
  ])
  if (!team) return null

  return {
    hackathon,
    agent,
    team,
    feedDown: live.scored && live.source === "unavailable",
    // No trophy before scoring starts or while every score ties.
    podium: live.scored && new Set(live.agents.map((a) => a.score)).size > 1,
    historyUnavailable: history === null,
    fieldSize: live.agents.length,
    // Until anyone votes every team holds 0 vote points.
    noVotes: live.teams.every((t) => t.votePoints === 0),
    checkpoints: history?.checkpoints ?? [],
    series: history?.series ?? null,
    frames: history?.frames ?? [],
    finals,
    strategy,
    builder,
    fleetDetail,
  }
})

export async function generateMetadata({ params }: PageProps) {
  const { slug, agentSlug } = await params
  const data = await getData(slug, agentSlug)
  if (!data) return { title: "Agent Not Found" }
  const { hackathon, agent, team } = data
  const title = `${agent.strategyTitle} — ${hackathon.title}`
  const builtBy = agent.driver ? `, built by ${agent.driver.name},` : ""
  const description = `${agent.strategyTitle}${builtBy} is racing for ${team.name} in the ${hackathon.title}. Currently ranked #${agent.rank}.`
  return {
    title,
    description,
    openGraph: { type: "website", title, description, url: `/hackathons/${hackathon.slug}/agents/${agent.slug}` },
    twitter: { card: "summary_large_image", title, description },
  }
}

const ordinal = (n: number) => {
  const tail = n % 100
  if (tail >= 11 && tail <= 13) return `${n}th`
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`
}
const signedUsd = (v: number) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`

export default async function AgentPage({ params }: PageProps) {
  const { slug, agentSlug } = await params
  const data = await getData(slug, agentSlug)
  if (!data) notFound()

  const {
    hackathon,
    agent,
    team,
    feedDown,
    podium,
    historyUnavailable,
    fieldSize,
    noVotes,
    checkpoints,
    series,
    frames,
    finals,
    strategy,
    builder,
    fleetDetail,
  } = data
  const primary = team.primaryColor || DEFAULT_PRIMARY_COLOR

  // The replay: the agent's readings in hours since the start, ending where
  // the leaderboard has it.
  const raceHours = raceDurationHours(finals)
  // eslint-disable-next-line react-hooks/purity -- as in Botcamp (its ESLint predates this rule)
  const elapsedHours = (Date.now() - finals.start.getTime()) / 3_600_000
  const replay: ReplayData = {
    raceStart: finals.start.toISOString(),
    raceHours,
    endHour: Math.min(raceHours, Math.max(0, elapsedHours)),
    live: elapsedHours < raceHours,
    series:
      series?.points.map((p) => ({
        hour: (Date.parse(p.timestamp) - finals.start.getTime()) / 3_600_000,
        pnl: p.pnlQuote,
        volume: p.volumeQuote,
      })) ?? [],
    frames,
    final: { rank: agent.rank, score: agent.score, pnl: agent.pnlQuote, volume: agent.metrics?.volumeQuote ?? 0 },
    fieldSize,
    startingCapitalQuote: STARTING_CAPITAL_QUOTE,
    checkpointHours: RACE_CHECKPOINT_HOURS,
    color: primary,
  }
  const replayable = isReplayable(replay)

  // This agent's line through the checkpoints.
  const timeline = checkpoints
    .filter((cp) => cp.positions[agent.agentId] !== undefined)
    .map((cp) => ({ cp, rank: cp.ranks[agent.agentId], stats: cp.stats[agent.agentId] }))

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <AgentReplayProvider data={replay}>
          <AgentStickyBar
            title={agent.strategyTitle}
            rank={agent.rank}
            fieldSize={fieldSize}
            score={agent.score}
            color={primary}
          />

          {/* Hero — dark, lit by the team color rather than painted in it, with
              the running position set huge like an F1 timing graphic. It fades
              into the shared race backdrop below, so there's no hard seam. */}
          <section className="relative overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 60% 70% at 15% 0%, ${primary}40, transparent 70%), radial-gradient(ellipse 50% 60% at 95% 30%, ${primary}1f, transparent 70%)`,
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
            />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />

            <div className="container mx-auto px-4 md:px-6 max-w-5xl relative pt-8 pb-14 md:pt-10 md:pb-20">
              <Link
                href={`/hackathons/${hackathon.slug}#leaderboard`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-10 md:mb-14"
              >
                <ArrowLeft className="h-4 w-4" />
                Leaderboard
              </Link>

              <div className="grid md:grid-cols-[auto_1fr] items-end gap-6 md:gap-10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
                {/* Giant position, outlined in the team color */}
                <div className="flex items-end gap-3">
                  {podium && agent.rank === 1 && (
                    <Trophy className="h-8 w-8 md:h-10 md:w-10 text-amber-400 mb-3 md:mb-5" aria-hidden />
                  )}
                  {/* Where the agent finished (or stands now); the replay doesn't move it. */}
                  <span
                    className="font-mono font-black leading-[0.8] tracking-[-0.06em] text-[clamp(5.5rem,16vw,11rem)] tabular-nums"
                    style={{ WebkitTextStroke: `2px ${primary}`, color: `${primary}26` }}
                    aria-label={`Position ${agent.rank} of ${fieldSize}`}
                  >
                    #{agent.rank}
                  </span>
                </div>

                <div className="min-w-0 pb-1">
                  <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                    {hackathon.title} · {replay.live ? "" : "Finished "}#{agent.rank} of {fieldSize}
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-bc-tighter text-foreground mb-3">
                    {agent.strategyTitle}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {agent.driver && <span className="text-muted-foreground">Built by {agent.driver.name}</span>}
                    <Link
                      href={`/hackathons/${hackathon.slug}/teams/${team.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur-xs px-3 py-1 hover:border-[color:var(--team)] transition-colors"
                      style={{ ["--team" as string]: primary }}
                    >
                      <TeamLogoBadge
                        logoUrl={team.logoUrl}
                        logoUrlDark={team.logoUrlDark}
                        alt={team.name}
                        className="w-5 h-5 rounded-bc-sm shrink-0"
                        imageSize={12}
                        iconClassName="h-3 w-3"
                      />
                      <span className="text-sm font-medium">Racing for {team.name}</span>
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <RaceBackdrop>
            <div className="container mx-auto px-4 md:px-6 max-w-5xl pt-4 pb-16 md:pb-24 space-y-bc-16">
              {feedDown && (
                <div
                  role="alert"
                  className="rounded-bc-xl border border-red-500/40 bg-red-500/[0.06] px-5 py-4 text-sm text-red-600 dark:text-red-400"
                >
                  Live race data is unavailable right now, so this agent&apos;s position and numbers aren&apos;t
                  current. They&apos;ll update once the feed reconnects.
                </div>
              )}

              {/* Who and what is racing: the strategy and its builder */}
              {(strategy || agent.driver) && (
                <section className="sd-reveal grid gap-4 md:grid-cols-2">
                  {strategy && (
                    <Link
                      href={`/hub/${strategy.slug}`}
                      className="group flex flex-col rounded-bc-xl border border-border bg-card/80 backdrop-blur-xs p-6 md:p-7 transition-colors hover:border-[color:var(--team)]"
                      style={{ ["--team" as string]: primary }}
                    >
                      <Eyebrow>Strategy · {STRATEGY_TYPE_LABELS[strategy.strategyType] ?? strategy.strategyType}</Eyebrow>
                      <h2 className="text-2xl font-bold tracking-bc-tight mb-2">{strategy.title}</h2>
                      {strategy.summary && <p className="text-muted-foreground line-clamp-3 mb-5">{strategy.summary}</p>}
                      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        View the strategy
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  )}
                  {agent.driver && (
                    <BuilderCard
                      name={agent.driver.name}
                      avatarUrl={agent.driver.avatarUrl}
                      tagline={builder.tagline}
                      location={builder.location}
                      href={builder.slug && builder.profileVisibility === "PUBLIC" ? `/builders/${builder.slug}` : null}
                      color={primary}
                    />
                  )}
                </section>
              )}

              {/* How it got here: the race replayed */}
              {replayable && (
                <section className="sd-reveal">
                  <SectionTitle title="How the Race Unfolded" />
                  {/* Headline numbers — they follow the replay */}
                  <div className="mb-4">
                    <ReplayStats />
                    {replay.live && agent.metrics?.online === false && agent.metrics.reportedAt && (
                      <p className="mt-3 font-mono text-xs text-muted-foreground">
                        Not reporting · last reading{" "}
                        {new Date(agent.metrics.reportedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: "UTC",
                        })}{" "}
                        UTC
                      </p>
                    )}
                  </div>
                  <ReplayPanel />
                  {timeline.length > 1 && (
                    <div className="mt-4">
                      {/* Checkpoint table — the same numbers, readable without the charts */}
                      <div className="rounded-bc-xl border border-border bg-card/80 backdrop-blur-xs overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              <th className="text-left font-bold px-5 py-3">Checkpoint</th>
                              <th className="text-right font-bold px-5 py-3">Position</th>
                              <th className="text-right font-bold px-5 py-3">P&amp;L</th>
                              <th className="text-right font-bold px-5 py-3">Volume</th>
                              <th className="text-right font-bold px-5 py-3">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 font-mono tabular-nums">
                            {timeline
                              .filter(({ cp }) => cp.hour > 0)
                              .map(({ cp, rank, stats }) => (
                                <tr key={cp.hour}>
                                  <td className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-xs">{cp.label}</td>
                                  <td className="px-5 py-3 text-right">#{rank}</td>
                                  <td
                                    className="px-5 py-3 text-right"
                                    style={{ color: (stats?.pnlQuote ?? 0) >= 0 ? GAIN_COLOR : LOSS_COLOR }}
                                  >
                                    {signedUsd(stats?.pnlQuote ?? 0)}
                                  </td>
                                  <td className="px-5 py-3 text-right">${Math.round(stats?.volumeQuote ?? 0).toLocaleString()}</td>
                                  <td className="px-5 py-3 text-right font-bold">{formatPoints(stats?.score ?? 0)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Why it's ranked where it is */}
              <section className="sd-reveal">
                <SectionTitle title="Where the Points Come From" />
                <div className="rounded-bc-xl border border-border bg-card/80 backdrop-blur-xs divide-y divide-border">
                  {SCORING_CRITERIA.map((criterion) => {
                    const part = agent.breakdown.find((b) => b.key === criterion.key)
                    const maxPoints = part?.maxPoints ?? fieldSize * criterion.multiplier
                    const points = part?.points ?? 0
                    const outOf = part?.outOf ?? fieldSize
                    const rankLabel = noVotes && criterion.key === "vote"
                      ? "No votes yet"
                      : `${ordinal(part?.rank ?? outOf)} of ${outOf}${criterion.key === "vote" ? " teams" : ""}`
                    return (
                      <div key={criterion.key} className="grid grid-cols-[1fr_auto] md:grid-cols-[14rem_1fr_7rem] items-center gap-3 md:gap-6 p-5">
                        <div>
                          <div className="font-semibold">{criterion.label}</div>
                          <div className="font-mono text-xs text-muted-foreground">{criterion.weight}% of the score</div>
                        </div>
                        <div className="order-3 col-span-2 md:order-none md:col-span-1">
                          <div className="flex items-center justify-between mb-1.5 font-mono text-xs">
                            <span className="text-foreground font-bold">
                              {rankLabel}
                            </span>
                            <span className="text-muted-foreground">
                              {formatPoints(points)} / {formatPoints(maxPoints)} pts
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-border/70 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(points / maxPoints) * 100}%`, background: primary }}
                            />
                          </div>
                        </div>
                        <div className="text-right font-mono text-xl font-bold tabular-nums">{formatPoints(points)}</div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-muted-foreground text-xs mt-3">
                  On P&amp;L and Volume agents are ranked 1–{fieldSize}; first earns {fieldSize} points and last earns 1.
                  For the HBOT Vote, holders back the teams on Snapshot, teams are ranked by the HBOT they receive, and every
                  agent carries its team&apos;s vote points ({VOTE_POINTS_STEP} per place, top team highest; tied teams share). Score ={" "}
                  {SCORING_CRITERIA.map((c) => `${c.multiplier} × ${c.key === "pnl" ? "P&L" : c.key === "volume" ? "Volume" : "Vote"}`).join(" + ")}.
                </p>
              </section>

              {historyUnavailable && (
                <section className="sd-reveal">
                  <SectionTitle title="How the Race Unfolded" />
                  <div
                    role="alert"
                    className="rounded-bc-xl border border-border bg-card/80 backdrop-blur-xs px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    Race history is unavailable right now. Try again in a few minutes.
                  </div>
                </section>
              )}

              {fleetDetail && <AgentTraded detail={fleetDetail} leaderboardPnl={agent.pnlQuote} color={primary} />}
              {fleetDetail && <AgentExecuted detail={fleetDetail} color={primary} />}


            </div>
          </RaceBackdrop>
        </AgentReplayProvider>
      </main>
      <SiteFooter />
    </div>
  )
}
