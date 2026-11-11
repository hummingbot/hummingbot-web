"use client"

import { useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Trophy } from "lucide-react"
import { TeamLogoBadge } from "./TeamLogoBadge"
import { CountUp } from "./CountUp"
import { DEFAULT_PRIMARY_COLOR, STARTING_CAPITAL_QUOTE } from "@/botcamp/lib/hackathon-squads"
import { cn } from "@/botcamp/lib/utils"
import hbotLogoDark from "@/botcamp/images/logos/hbot-dark.png"
import hbotLogoLight from "@/botcamp/images/logos/hbot-light.png"
import type { HackathonLeaderboard, LeaderboardAgentRow } from "@/botcamp/lib/hackathon-leaderboard-data"
import {
  RACE_CHECKPOINT_HOURS,
  VOTE_POINTS_STEP,
  HONORABLE_MENTIONS,
  HONORABLE_MENTION_PRIZE,
  podiumPrizes,
  formatPoints,
  pointsDecimals,
  type Checkpoint,
  type CriterionScore,
  type TeamStanding,
} from "@/botcamp/lib/hackathon-leaderboard"
import { SCORING_CRITERIA, type ScoringCriterionKey } from "@/botcamp/lib/hackathon-squads"
import { GAIN_COLOR, LOSS_COLOR } from "@/botcamp/lib/design-constants"

interface LiveTeam {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  logoUrlDark: string | null
  primaryColor: string | null
}

interface LeaderboardTableProps {
  leaderboard: HackathonLeaderboard
  // Standings at each checkpoint reached so far, grid first: the Δ column's base.
  history: Checkpoint[]
  teams: LiveTeam[]
  hackathonSlug: string
  // Finals window, ISO strings — drives the "Hour 18 of 48" status.
  raceStart: string
  raceEnd: string
  // A line between the race progress bar and the table.
  intro?: string
  // The scoring terms under the table; off when the page shows them beside it.
  showTerms?: boolean
}


// Volume in whole dollars ("$183,069"), not abbreviated.
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

// Shared column layout so the header lines up with every row. The three
// scoring categories show from md; the team / drivers columns join at lg.
const DRIVER_COLS =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] md:grid-cols-[3rem_3rem_minmax(0,1fr)_7rem_6.5rem_6rem_7rem_1rem] lg:grid-cols-[3rem_3rem_minmax(0,1fr)_9rem_7rem_6.5rem_6rem_7rem_1rem] items-center gap-3 md:gap-4"
// Once the race is over: no Δ column, the team moves under the driver, and
// Winnings joins Score from lg.
const FINAL_DRIVER_COLS =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] md:grid-cols-[3rem_minmax(0,1fr)_7rem_6.5rem_6rem_7rem_1rem] lg:grid-cols-[3rem_minmax(0,1fr)_7rem_6.5rem_6rem_7rem_7.5rem_1rem] items-center gap-3 md:gap-4"
const hbotCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })

// A team's HBOT on Snapshot, as the Vote column shows it: the amount beside
// the HBOT logo.
function HbotValue({ hbot }: { hbot: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Image src={hbotLogoLight} alt="HBOT" width={14} height={14} className="dark:hidden" />
      <Image src={hbotLogoDark} alt="HBOT" width={14} height={14} className="hidden dark:block" />
      {hbotCompact.format(hbot)}
    </span>
  )
}

const TEAM_COLS =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] md:grid-cols-[3rem_minmax(0,1fr)_7rem_6.5rem_6rem_7rem] lg:grid-cols-[3rem_11rem_minmax(0,1fr)_7rem_6.5rem_6rem_7rem] items-center gap-3 md:gap-4"

const TAB_LABELS = { drivers: "Builders", teams: "Teams" } as const

const CATEGORY_LABELS: Record<ScoringCriterionKey, string> = { pnl: "P&L", volume: "Volume", vote: "Vote" }
// Column order, as the score formula reads.
const CATEGORY_ORDER: ScoringCriterionKey[] = ["pnl", "volume", "vote"]

// Column header for a scoring category: name and multiplier, then what the
// second line of each cell holds.
function CategoryHeader({ label, multiplier }: { label: string; multiplier: number }) {
  return (
    <span className="hidden md:block text-right leading-tight">
      <span className="block">
        {label} <span className="text-primary">×{multiplier}</span>
      </span>
      <span className="block font-normal normal-case tracking-normal opacity-70">rank · pts</span>
    </span>
  )
}

// One scoring category in a row: the raw total, then its rank and the points
// it adds to the score (rank points × multiplier) — so the score is the sum of
// the row's three point figures.
function CategoryCell({
  value,
  rank,
  points,
  title,
}: {
  value: ReactNode
  // Null when the category doesn't rank anyone yet (no votes cast).
  rank: number | null
  points: number
  title?: string
}) {
  return (
    <div className="hidden md:block text-right leading-tight" title={title}>
      <div className="font-mono tabular-nums text-sm font-semibold">{value}</div>
      <div className="font-mono tabular-nums text-[11px] text-muted-foreground">
        {rank === null ? "—" : `#${rank}`} · {formatPoints(points)}
      </div>
    </div>
  )
}

function pointsOf(breakdown: CriterionScore[], key: ScoringCriterionKey): CriterionScore | undefined {
  return breakdown.find((b) => b.key === key)
}

// Competition rank (1, 2, 2, 4) of each team on summed category points.
function rankBy(values: Map<string, number>): Map<string, number> {
  const all = [...values.values()]
  return new Map([...values].map(([id, v]) => [id, all.filter((o) => o > v).length + 1]))
}

function signedUsd(quote: number): string {
  return `${quote >= 0 ? "+" : "-"}$${Math.abs(quote).toFixed(2)}`
}

// No podium while positions mean nothing — see driverPodium / teamPodium.
// Gold, silver and bronze: the trophy badge, and the tint and ring that lift
// a podium row off the rest of the table. Ties share a medal.
const PODIUM: Record<number, { label: string; badge: string; row: string }> = {
  1: {
    label: "Gold",
    badge: "bg-amber-400/20 border-amber-400/60 text-amber-600 dark:text-amber-300",
    row: "bg-amber-400/[0.09] shadow-[inset_0_0_0_1px_rgb(251_191_36/0.28)]",
  },
  2: {
    label: "Silver",
    badge: "bg-slate-300/20 border-slate-400/60 text-slate-500 dark:text-slate-200",
    row: "bg-slate-300/[0.07] shadow-[inset_0_0_0_1px_rgb(203_213_225/0.22)]",
  },
  3: {
    label: "Bronze",
    badge: "bg-orange-600/20 border-orange-600/55 text-orange-700 dark:text-orange-400",
    row: "bg-orange-600/[0.08] shadow-[inset_0_0_0_1px_rgb(234_88_12/0.25)]",
  },
}

function RankBadge({ rank, podium: showPodium = true }: { rank: number; podium?: boolean }) {
  const medal = showPodium ? PODIUM[rank] : undefined
  if (medal) {
    return (
      <span
        className={cn("flex items-center justify-center w-9 h-9 rounded-full border", medal.badge)}
        title={`${medal.label}, P${rank}`}
      >
        <Trophy className="h-[18px] w-[18px]" aria-label={`${medal.label}, P${rank}`} />
      </span>
    )
  }
  return (
    <span className="flex items-center justify-center w-8 h-8 font-mono text-sm font-bold text-muted-foreground">
      {rank}
    </span>
  )
}

// Places gained (▲) or lost (▼) since the comparison checkpoint. Arrow plus
// sign, not color alone.
function PositionDelta({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) {
    return <span className="font-mono text-xs text-muted-foreground">—</span>
  }
  const up = delta > 0
  return (
    <span className="font-mono text-xs font-bold tabular-nums" style={{ color: up ? GAIN_COLOR : LOSS_COLOR }}>
      {up ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  )
}

function PnlPercent({ percent }: { percent: number }) {
  return (
    <span style={{ color: percent >= 0 ? GAIN_COLOR : LOSS_COLOR }}>
      <CountUp value={percent} decimals={2} signed suffix="%" />
    </span>
  )
}

// Score plus a thin bar against the leader's score, so gaps read at a glance.
// `winnings`, once the race is over, shows under the bar until lg, where it
// has its own column.
function Score({ score, leader, color, winnings }: { score: number; leader: number; color: string; winnings?: number }) {
  const width = leader > 0 ? Math.max(4, (score / leader) * 100) : 0
  return (
    <div className="text-right">
      <div className="font-mono tabular-nums text-base md:text-lg font-bold">
        <CountUp value={score} decimals={pointsDecimals(score)} />
      </div>
      <div className="mt-1 h-1 w-full rounded-full bg-border/70 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
      </div>
      {winnings !== undefined && (
        <div className="lg:hidden mt-1 font-mono tabular-nums text-[11px] text-muted-foreground">{usdWhole.format(winnings)}</div>
      )}
    </div>
  )
}

// What an agent takes home: its starting capital as it ended the race, plus
// its share of the podium prizes and any honorable mention prize.
function Winnings({ winnings, prize }: { winnings: number; prize: number }) {
  return (
    <div className="hidden lg:block text-right leading-tight">
      <div className="font-mono tabular-nums text-sm font-semibold">{usdWhole.format(winnings)}</div>
      <div className="font-mono tabular-nums text-[11px] text-muted-foreground">
        {prize > 0 ? `incl. ${usdWhole.format(prize)} prize` : "capital"}
      </div>
    </div>
  )
}

function useRaceStatus(raceStart: string, raceEnd: string) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  if (!now) return { ready: false, phase: "upcoming" as const, hour: 0, totalHours: 0, progress: 0, startsInMs: 0 }
  const start = new Date(raceStart)
  const end = new Date(raceEnd)
  const totalHours = Math.round((end.getTime() - start.getTime()) / 3_600_000)
  const startsInMs = Math.max(0, start.getTime() - now.getTime())
  if (now < start) return { ready: true, phase: "upcoming" as const, hour: 0, totalHours, progress: 0, startsInMs }
  if (now > end) return { ready: true, phase: "finished" as const, hour: totalHours, totalHours, progress: 1, startsInMs }
  const elapsedMs = now.getTime() - start.getTime()
  const hour = Math.min(totalHours, Math.floor(elapsedMs / 3_600_000) + 1)
  return {
    ready: true,
    phase: "live" as const,
    hour,
    totalHours,
    progress: elapsedMs / (end.getTime() - start.getTime()),
    startsInMs,
  }
}

// "1d 22h" / "5h 12m" / "8m": time until the start, to the minute.
function formatStartsIn(ms: number): string {
  const minutes = Math.ceil(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

/**
 * The race clock as a track: how far into the race we are, with the history
 * checkpoints marked along it. Shown above the table before and during the
 * race; before the start it sits empty and counts down to the gun.
 */
function RaceProgress({
  upcoming,
  hour,
  totalHours,
  progress,
  startsInMs,
}: {
  upcoming: boolean
  hour: number
  totalHours: number
  progress: number
  startsInMs: number
}) {
  const percent = Math.min(100, Math.max(0, progress * 100))
  const hoursLeft = Math.max(0, Math.ceil(totalHours * (1 - progress)))
  const ticks = RACE_CHECKPOINT_HOURS.filter((h) => h < totalHours)
  return (
    <div className="mb-4 sm:mb-5">
      <div className="flex items-center justify-between mb-2.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em]">
        {upcoming ? (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            <span className="text-foreground">Not started</span>
            <span className="text-muted-foreground">· {totalHours} hours</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-foreground">Live</span>
            <span className="text-muted-foreground">
              · Hour {hour} of {totalHours}
            </span>
          </span>
        )}
        <span className="text-muted-foreground">
          {upcoming ? `Starts in ${formatStartsIn(startsInMs)}` : `${hoursLeft}h to go`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Race progress"
        aria-valuemin={0}
        aria-valuemax={totalHours}
        aria-valuenow={hour}
        aria-valuetext={upcoming ? `Starts in ${formatStartsIn(startsInMs)}` : `Hour ${hour} of ${totalHours}`}
        className="relative h-2 rounded-full bg-border/70"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-botcamp-amber to-primary transition-[width] duration-700"
          style={{ width: `${percent}%` }}
        />
        {ticks.map((h) => (
          <span
            key={h}
            className={cn(
              "absolute top-1/2 h-2 w-px -translate-y-1/2",
              h / totalHours <= progress ? "bg-background/60" : "bg-muted-foreground/40",
            )}
            style={{ left: `${(h / totalHours) * 100}%` }}
          />
        ))}
        {/* Leading edge: where the race is now. */}
        {!upcoming && (
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]"
            style={{ left: `${percent}%` }}
          />
        )}
      </div>
      <div className="relative mt-2 h-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="absolute left-0">Start</span>
        {ticks.map((h) => (
          <span
            key={h}
            className={cn("absolute -translate-x-1/2", h / totalHours <= progress && "text-foreground")}
            style={{ left: `${(h / totalHours) * 100}%` }}
          >
            {h}h
          </span>
        ))}
        <span className="absolute right-0">Finish</span>
      </div>
    </div>
  )
}

const multiplierOf = Object.fromEntries(SCORING_CRITERIA.map((c) => [c.key, c.multiplier]))

export function LeaderboardTable({
  leaderboard,
  history,
  teams,
  hackathonSlug,
  raceStart,
  raceEnd,
  intro,
  showTerms = true,
}: LeaderboardTableProps) {
  const [tab, setTab] = useState<"drivers" | "teams">("drivers")
  const hasEntrants = leaderboard.agents.length > 0
  const tabs = ["drivers", "teams"] as const

  // Δ compares today's standings with the latest checkpoint behind them: the
  // one before Final once the race is over, otherwise the latest passed. The
  // grid isn't a ranking, so there's no Δ until the 12h checkpoint.
  const reached = history.filter((cp) => !cp.isNow)
  const lastReached = reached[reached.length - 1]
  const compareTo = lastReached?.label === "Final" ? reached[reached.length - 2] : lastReached
  const deltaBase = compareTo && compareTo.hour > 0 ? compareTo : null
  const status = useRaceStatus(raceStart, raceEnd)
  const voteClosed = leaderboard.vote.status === "live" && leaderboard.vote.state === "closed"
  // Winnings are what each agent takes home, so only once the race is over.
  const final = status.phase === "finished" && leaderboard.scored
  const prizes = final ? podiumPrizes(leaderboard.agents) : {}
  const honorableMentions = new Set(final ? (HONORABLE_MENTIONS[hackathonSlug] ?? []) : [])
  // Nothing to rank yet (before the start, or no bot registered): the
  // selected agents at zero, in grid order.
  const unscored = !leaderboard.scored
  // Racing, and the roster is known but Condor's numbers aren't.
  const feedDown =
    hasEntrants && leaderboard.scored && leaderboard.source === "unavailable"
  // No podium or trophy while positions mean nothing: before scoring starts,
  // or when every score ties (the opening minutes, or the feed is down).
  const allTied = (scores: number[]) => new Set(scores).size <= 1
  const driverPodium = !unscored && !allTied(leaderboard.agents.map((a) => a.score))
  const teamPodium = !unscored && !allTied(leaderboard.teams.map((t) => t.score))

  const teamById = new Map(teams.map((t) => [t.id, t]))
  const agentById = new Map(leaderboard.agents.map((a) => [a.agentId, a]))
  const colorOf = (teamId: string) => teamById.get(teamId)?.primaryColor || DEFAULT_PRIMARY_COLOR
  const leaderScore = leaderboard.agents[0]?.score ?? 0
  // Until anyone votes every team holds 0 vote points; nobody is ranked.
  const noVotes = leaderboard.teams.every((t) => t.votePoints === 0)
  // Team tab: each category summed over the team's agents, ranked among teams.
  const teamCategory = Object.fromEntries(
    CATEGORY_ORDER.map((key) => {
      const points = new Map(
        leaderboard.teams.map((t) => [
          t.teamId,
          t.agentIds.reduce((sum, id) => sum + (pointsOf(agentById.get(id)?.breakdown ?? [], key)?.points ?? 0), 0),
        ]),
      )
      return [key, { points, ranks: rankBy(points) }]
    }),
  ) as Record<ScoringCriterionKey, { points: Map<string, number>; ranks: Map<string, number> }>

  const leaderTeamScore = leaderboard.teams[0]?.score ?? 0

  return (
    <>
      {status.ready && status.phase !== "finished" && (
        <RaceProgress
          upcoming={status.phase === "upcoming"}
          hour={status.hour}
          totalHours={status.totalHours}
          progress={status.progress}
          startsInMs={status.startsInMs}
        />
      )}
      {intro && <p className="mb-4 text-center text-sm text-muted-foreground">{intro}</p>}
      <div className="rounded-bc-xl border border-border overflow-hidden bg-card/80 backdrop-blur-xs">
        {/* Status bar: view toggle and data freshness, plus where the standings
            stand once the race is over (the progress bar above covers before and
            during). The HBOT vote closes after the race, so standings are final
            only once it has. */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em]">
            {status.phase === "finished" && (
              <span className="text-foreground">{voteClosed ? "Final Standings" : "Race Over · HBOT Vote Still Open"}</span>
            )}
          </div>

          {hasEntrants && (
            <div role="tablist" className="flex rounded-bc-md border border-border p-0.5 bg-background/60">
              {tabs.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-3 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                    tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
          )}

          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {feedDown ? (
              <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400">
                Feed unavailable
              </span>
            ) : leaderboard.generatedAt ? (
              <>Updated {new Date(leaderboard.generatedAt).toLocaleTimeString()}</>
            ) : null}
          </span>
        </div>

        {feedDown && (
          <div role="alert" className="px-4 sm:px-5 py-3 border-b border-border bg-red-500/[0.06] text-sm text-red-600 dark:text-red-400">
            Live race data is unavailable right now, so these standings aren&apos;t current. They&apos;ll update once
            the feed reconnects.
          </div>
        )}

        {!hasEntrants ? (
          <div className="px-4 sm:px-5 py-16 text-center">
            <p className="font-semibold">Standings begin when the race starts.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Each agent appears here as soon as its bot is deployed for the finals.
            </p>
          </div>
        ) : tab === "drivers" ? (
          <>
            <div
              className={cn(
                final ? FINAL_DRIVER_COLS : DRIVER_COLS,
                "px-4 sm:px-5 py-2.5 border-b border-border font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground",
              )}
            >
              <span>Pos</span>
              {!final && <span className="hidden md:block">{deltaBase ? `vs ${deltaBase.label}` : "Δ"}</span>}
              <span>Agent</span>
              {!final && <span className="hidden lg:block">Team</span>}
              {CATEGORY_ORDER.map((key) => (
                <CategoryHeader key={key} label={CATEGORY_LABELS[key]} multiplier={multiplierOf[key]} />
              ))}
              <span className="text-right">Score</span>
              {final && <span className="hidden lg:block text-right">Winnings</span>}
              <span className="hidden md:block" />
            </div>
            <div className="divide-y divide-border/60">
              {leaderboard.agents.map((agent) => (
                <DriverRow
                  key={agent.agentId}
                  agent={agent}
                  team={teamById.get(agent.teamId)}
                  color={colorOf(agent.teamId)}
                  leaderScore={leaderScore}
                  hbot={leaderboard.teamVotes[agent.teamId] ?? 0}
                  noVotes={noVotes}
                  delta={deltaBase ? (deltaBase.ranks[agent.agentId] ?? agent.rank) - agent.rank : null}
                  final={final}
                  prize={
                    (prizes[agent.agentId] ?? 0) +
                    (honorableMentions.has(agent.slug) ? HONORABLE_MENTION_PRIZE : 0)
                  }
                  honorableMention={honorableMentions.has(agent.slug)}
                  unscored={unscored}
                  podium={driverPodium}
                  // Once the race is scored, an agent that has reported links to its
                  // agent page; before the start, and for an agent that hasn't
                  // reported, the row links to the strategy (or the team, if none).
                  href={
                    !unscored && agent.reporting
                      ? `/hackathons/${hackathonSlug}/agents/${agent.slug}`
                      : agent.slug
                        ? `/hub/${agent.slug}`
                        : `/hackathons/${hackathonSlug}/teams/${teamById.get(agent.teamId)?.slug ?? ""}`
                  }
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div
              className={cn(
                TEAM_COLS,
                "px-4 sm:px-5 py-2.5 border-b border-border font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground",
              )}
            >
              <span>Pos</span>
              <span>Team</span>
              <span className="hidden lg:block">Drivers</span>
              {CATEGORY_ORDER.map((key) => (
                <CategoryHeader key={key} label={CATEGORY_LABELS[key]} multiplier={multiplierOf[key]} />
              ))}
              <span className="text-right">Score</span>
            </div>
            <div className="divide-y divide-border/60">
              {leaderboard.teams.map((standing) => (
                <TeamRow
                  key={standing.teamId}
                  standing={standing}
                  team={teamById.get(standing.teamId)}
                  color={colorOf(standing.teamId)}
                  drivers={standing.agentIds.map((id) => agentById.get(id)).filter((a) => !!a)}
                  leaderScore={leaderTeamScore}
                  podium={teamPodium}
                  category={(key) => ({
                    points: teamCategory[key].points.get(standing.teamId) ?? 0,
                    rank: teamCategory[key].ranks.get(standing.teamId) ?? 0,
                  })}
                  hbot={leaderboard.teamVotes[standing.teamId] ?? 0}
                  noVotes={noVotes}
                  href={teamById.get(standing.teamId) ? `/hackathons/${hackathonSlug}/teams/${teamById.get(standing.teamId)!.slug}` : "#"}
                />
              ))}
            </div>
          </>
        )}

        {hasEntrants && showTerms && (
          <ScoringTerms
            agentCount={leaderboard.agents.length}
            teamCount={leaderboard.teams.length}
            className="px-4 sm:px-5 py-3 border-t border-border text-[11px] sm:text-xs"
          />
        )}
      </div>
    </>
  )
}

/** How a score is built: the criteria weights, rank points and vote points. */
export function ScoringTerms({
  agentCount,
  teamCount,
  brief = false,
  className,
}: {
  agentCount: number
  teamCount: number
  // Just the formula, without how rank and vote points are earned.
  brief?: boolean
  className?: string
}) {
  if (brief) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        Score = {multiplierOf.pnl} × P&amp;L points + {multiplierOf.volume} × Volume points + {multiplierOf.vote} × HBOT
        Vote points.
      </p>
    )
  }
  return (
    <p className={cn("text-muted-foreground", className)}>
      Score = {multiplierOf.pnl} × P&amp;L points + {multiplierOf.volume} × Volume points + {multiplierOf.vote} × HBOT
      Vote points, where P&amp;L and Volume rank points run from {agentCount} for first down to 1. HBOT holders back the
      teams on Snapshot, ranked by the HBOT each receives: the top team earns {VOTE_POINTS_STEP * teamCount} vote points,
      the next {VOTE_POINTS_STEP * (teamCount - 1)}, and so on, and each of a team&apos;s agents carries its team&apos;s
      vote points. The Vote column shows each team&apos;s HBOT; vote points follow the running tally and are final once
      the vote closes. An agent that hasn&apos;t traded (no volume) scores 0 on every criterion.
    </p>
  )
}

function DriverRow({
  agent,
  team,
  color,
  leaderScore,
  hbot,
  noVotes,
  delta,
  final,
  prize,
  honorableMention,
  unscored,
  podium,
  href,
}: {
  agent: LeaderboardAgentRow
  team: LiveTeam | undefined
  color: string
  leaderScore: number
  // The HBOT the agent's team has received on Snapshot so far.
  hbot: number
  noVotes: boolean
  delta: number | null
  // The race is over: winnings show, the Δ and team columns don't.
  final: boolean
  // The agent's share of the podium prizes plus any honorable mention prize,
  // once the race is over.
  prize: number
  honorableMention: boolean
  unscored: boolean
  podium: boolean
  href: string
}) {
  const pnl = pointsOf(agent.breakdown, "pnl")
  const volume = pointsOf(agent.breakdown, "volume")
  const vote = pointsOf(agent.breakdown, "vote")
  // A bot that isn't deployed yet isn't "offline".
  const offline = !unscored && agent.metrics !== null && !agent.metrics.online
  // Reporting, but no volume yet: it scores 0 everywhere and isn't ranked, so
  // the row says so instead of showing a last place it hasn't raced for.
  const idle = !unscored && agent.metrics !== null && agent.metrics.volumeQuote === 0
  const winnings = STARTING_CAPITAL_QUOTE + agent.pnlQuote + prize
  return (
    <Link
      href={href}
      className={cn(
        final ? FINAL_DRIVER_COLS : DRIVER_COLS,
        "relative px-4 sm:px-5 py-3 hover:bg-foreground/[0.03] transition-colors",
        podium && PODIUM[agent.rank]?.row,
      )}
    >
      {/* Team color stripe */}
      <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: color }} />

      <RankBadge rank={agent.rank} podium={podium} />

      {!final && (
        <div className="hidden md:block">
          <PositionDelta delta={delta} />
        </div>
      )}

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{agent.strategyTitle}</span>
          {honorableMention && (
            <span
              className="flex-shrink-0 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300 border border-sky-500/50 bg-sky-500/10 rounded px-1 py-0.5"
              title={`Honorable Mention, ${usdWhole.format(HONORABLE_MENTION_PRIZE)} prize`}
            >
              <Trophy className="h-3 w-3" aria-hidden />
              <span className="hidden sm:inline">Honorable Mention</span>
            </span>
          )}
          {offline && (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-red-500 border border-red-500/40 rounded px-1">
              Offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm text-muted-foreground">
          <span className="truncate">
            {agent.driver?.name ?? "Agent Driver"}
            <span className={cn(!final && "lg:hidden")}> · {team?.name}</span>
          </span>
          {/* Phones only: from md the Volume cell says it instead. */}
          {idle && !offline && (
            <span className="md:hidden flex-shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] border border-border rounded px-1">
              No trades yet
            </span>
          )}
        </div>
      </div>

      {!final && (
        <div className="hidden lg:flex items-center gap-2 min-w-0">
          <TeamLogoBadge
            logoUrl={team?.logoUrl ?? null}
            logoUrlDark={team?.logoUrlDark ?? null}
            alt={team?.name ?? ""}
            className="w-6 h-6 rounded-bc-md flex-shrink-0"
            imageSize={14}
            iconClassName="h-3 w-3"
          />
          <span className="text-sm truncate">{team?.name}</span>
        </div>
      )}

      <CategoryCell
        value={agent.metrics ? <PnlPercent percent={agent.pnlPercent} /> : "—"}
        title={agent.metrics ? signedUsd(agent.pnlQuote) : undefined}
        rank={idle ? null : (pnl?.rank ?? null)}
        points={pnl?.points ?? 0}
      />
      <CategoryCell
        value={
          idle ? (
            <span className="font-sans text-xs font-normal text-muted-foreground">No trades yet</span>
          ) : agent.metrics ? (
            usdWhole.format(agent.metrics.volumeQuote)
          ) : (
            "—"
          )
        }
        rank={idle ? null : (volume?.rank ?? null)}
        points={volume?.points ?? 0}
      />
      <CategoryCell
        value={<HbotValue hbot={hbot} />}
        title="HBOT the team has received on Snapshot"
        rank={noVotes || idle ? null : (vote?.rank ?? null)}
        points={vote?.points ?? 0}
      />

      <Score score={agent.score} leader={leaderScore} color={color} winnings={final ? winnings : undefined} />
      {final && <Winnings winnings={winnings} prize={prize} />}

      <ChevronRight className="hidden md:block h-4 w-4 text-muted-foreground" />
    </Link>
  )
}

function TeamRow({
  standing,
  team,
  color,
  drivers,
  leaderScore,
  podium,
  category,
  hbot,
  noVotes,
  href,
}: {
  standing: TeamStanding
  team: LiveTeam | undefined
  color: string
  drivers: LeaderboardAgentRow[]
  leaderScore: number
  podium: boolean
  // A category's points summed over the team's agents, and the team's rank on them.
  category: (key: ScoringCriterionKey) => { points: number; rank: number }
  // The HBOT the team has received on Snapshot so far.
  hbot: number
  noVotes: boolean
  href: string
}) {
  const pnlQuote = drivers.reduce((sum, d) => sum + d.pnlQuote, 0)
  const volumeQuote = drivers.reduce((sum, d) => sum + (d.metrics?.volumeQuote ?? 0), 0)
  return (
    <Link
      href={href}
      className={cn(
        TEAM_COLS,
        "relative px-4 sm:px-5 py-3.5 hover:bg-foreground/[0.03] transition-colors",
        podium && PODIUM[standing.rank]?.row,
      )}
    >
      <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: color }} />

      <RankBadge rank={standing.rank} podium={podium} />

      <div className="flex items-center gap-3 min-w-0">
        <TeamLogoBadge
          logoUrl={team?.logoUrl ?? null}
          logoUrlDark={team?.logoUrlDark ?? null}
          alt={team?.name ?? ""}
          className="w-9 h-9 rounded-bc-lg flex-shrink-0"
          imageSize={20}
          iconClassName="h-4 w-4"
        />
        <span className="font-semibold tracking-bc-tight truncate">{team?.name}</span>
      </div>

      <div className="hidden lg:flex flex-wrap gap-2 min-w-0">
        {drivers.map((d) => (
          <span
            key={d.agentId}
            className="inline-flex items-center gap-1.5 rounded-bc-md border border-border/70 bg-background/50 px-2 py-1 text-xs max-w-full min-w-0"
          >
            <span className="font-mono font-bold tabular-nums" style={{ color }}>
              {d.rank}
            </span>
            <span className="truncate">{d.strategyTitle}</span>
          </span>
        ))}
      </div>

      <CategoryCell
        value={<span style={{ color: pnlQuote >= 0 ? GAIN_COLOR : LOSS_COLOR }}>{signedUsd(pnlQuote)}</span>}
        rank={category("pnl").rank}
        points={category("pnl").points}
      />
      <CategoryCell
        value={usdWhole.format(volumeQuote)}
        rank={category("volume").rank}
        points={category("volume").points}
      />
      <CategoryCell
        value={<HbotValue hbot={hbot} />}
        title="HBOT the team has received on Snapshot"
        rank={noVotes ? null : category("vote").rank}
        points={category("vote").points}
      />

      <Score score={standing.score} leader={leaderScore} color={color} />
    </Link>
  )
}
