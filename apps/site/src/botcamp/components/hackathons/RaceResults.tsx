"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { TrendingDown, TrendingUp, Trophy } from "lucide-react"
import { Badge } from "@/botcamp/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader } from "@/botcamp/components/ui/card"
import { CountUp } from "./CountUp"
import { TeamLogoBadge } from "./TeamLogoBadge"
import { STARTING_CAPITAL_QUOTE } from "@/botcamp/lib/hackathon-squads"
import { formatPoints } from "@/botcamp/lib/hackathon-leaderboard"
import { joinNames, podiumPlaces, raceFigures } from "@/botcamp/lib/hackathon-race-figures"
import { GAIN_COLOR, LOSS_COLOR } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import type { HackathonLeaderboard, LeaderboardAgentRow } from "@/botcamp/lib/hackathon-leaderboard-data"

export interface ResultTeam {
  id: string
  name: string
  logoUrl: string | null
  logoUrlDark: string | null
}

const EYEBROW = "font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
const SURFACE = "border-border bg-card/80 shadow-none backdrop-blur-xs"

const signedUsd = (n: number): string =>
  `${n >= 0 ? "+" : "−"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const startingCapital = STARTING_CAPITAL_QUOTE.toLocaleString("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

// Medal colors: the trophy chip, the card's edge and its glow. On md+ the
// cards stand as a podium — 2nd, 1st, 3rd — each step lower than the last.
const PLACES = {
  1: {
    label: "1st",
    card: "border-amber-400/60 bg-amber-400/[0.06]",
    chip: "border-amber-400/50 bg-amber-400/15 text-amber-700 dark:text-amber-300",
    glow: "0 0 56px -10px rgba(251,191,36,0.55)",
    step: "md:order-2",
  },
  2: {
    label: "2nd",
    card: "border-slate-300/50 bg-slate-300/[0.04]",
    chip: "border-slate-400/50 bg-slate-400/15 text-slate-600 dark:text-slate-200",
    glow: "0 0 48px -12px rgba(226,232,240,0.4)",
    step: "md:order-1 md:mt-10 short:md:mt-6",
  },
  3: {
    label: "3rd",
    card: "border-orange-500/50 bg-orange-500/[0.04]",
    chip: "border-orange-600/50 bg-orange-600/15 text-orange-700 dark:text-orange-400",
    glow: "0 0 48px -12px rgba(234,88,12,0.45)",
    step: "md:order-3 md:mt-16 short:md:mt-10",
  },
} as const

function teamOf(teams: ResultTeam[], teamId: string): ResultTeam {
  const team = teams.find((t) => t.id === teamId)
  if (!team) throw new Error(`Team ${teamId} is not in the hackathon's teams`)
  return team
}

function AgentName({
  agent,
  hackathonSlug,
  className,
}: {
  agent: LeaderboardAgentRow
  hackathonSlug: string
  className?: string
}) {
  const classes = cn("block text-balance break-words font-semibold leading-snug tracking-bc-tight", className)
  // Only an agent that has reported has a page.
  return agent.reporting ? (
    <Link
      href={`/hackathons/${hackathonSlug}/agents/${agent.slug}`}
      title={agent.strategyTitle}
      className={cn(classes, "underline-offset-4 hover:underline focus-visible:underline")}
    >
      {agent.strategyTitle}
    </Link>
  ) : (
    <span title={agent.strategyTitle} className={classes}>
      {agent.strategyTitle}
    </span>
  )
}

const volumeUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

// A podium agent's volume and P&L, as the leaderboard has them.
function PodiumFigures({ agent }: { agent: LeaderboardAgentRow }) {
  const pnlPercent = (agent.pnlQuote / STARTING_CAPITAL_QUOTE) * 100
  return (
    <CardFooter className="grid grid-cols-2 gap-4 border-t border-border pt-4 short:px-4 short:pb-3 short:pt-3">
      <div className="min-w-0">
        <p className={EYEBROW}>Volume</p>
        <p className="mt-1 font-mono text-lg font-bold tabular-nums">{volumeUsd.format(agent.metrics?.volumeQuote ?? 0)}</p>
      </div>
      <div className="min-w-0">
        <p className={EYEBROW}>P&amp;L</p>
        <p
          className="mt-1 font-mono text-lg font-bold tabular-nums"
          style={{ color: agent.pnlQuote === 0 ? undefined : agent.pnlQuote > 0 ? GAIN_COLOR : LOSS_COLOR }}
        >
          {signedUsd(agent.pnlQuote)}
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {pnlPercent >= 0 ? "+" : "−"}
          {Math.abs(pnlPercent).toFixed(2)}% on {startingCapital}
        </p>
      </div>
    </CardFooter>
  )
}

// The top three finishers: a card per place, in finishing order. Agents that
// tie share a place, and so a card.
function Podium({
  leaderboard,
  teams,
  hackathonSlug,
}: {
  leaderboard: HackathonLeaderboard
  teams: ResultTeam[]
  hackathonSlug: string
}) {
  const places = podiumPlaces(leaderboard.agents)
  return (
    <ol
      aria-label="Top three finishers"
      className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_1.15fr_1fr] md:gap-5 short:gap-3"
    >
      {places.map(({ place, agents }) => {
        const medal = PLACES[place]
        const tied = agents.length > 1
        return (
          <li key={place} className={cn("flex min-w-0", medal.step)}>
            <Card className={cn("flex w-full flex-col", SURFACE, medal.card)} style={{ boxShadow: medal.glow }}>
              <CardHeader className="flex-row items-center justify-between space-y-bc-0 pb-4 short:p-4 short:pb-3">
                <Badge
                  variant="outline"
                  className={cn("gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em]", medal.chip)}
                >
                  <Trophy className="h-3.5 w-3.5" aria-hidden />
                  {medal.label}
                  {tied ? ` · ${agents.length}-way tie` : ""}
                </Badge>
                <CardAction>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {formatPoints(agents[0].score)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">pts</span>
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent className="flex-1 short:px-4 short:pb-4">
                <ul className="space-y-bc-4">
                  {agents.map((agent) => {
                    const team = teamOf(teams, agent.teamId)
                    return (
                      <li key={agent.agentId} className="flex min-w-0 items-start gap-3">
                        <TeamLogoBadge
                          logoUrl={team.logoUrl}
                          logoUrlDark={team.logoUrlDark}
                          alt={team.name}
                          className="h-10 w-10 flex-shrink-0 rounded-bc-lg"
                          imageSize={22}
                          iconClassName="h-5 w-5"
                        />
                        <div className="min-w-0">
                          <AgentName
                            agent={agent}
                            hackathonSlug={hackathonSlug}
                            className={tied ? "line-clamp-2 text-sm" : place === 1 ? "text-2xl" : "text-lg"}
                          />
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {agent.driver?.name ?? "Agent Driver"} · {team.name}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
              {/* How they got there */}
              {!tied && <PodiumFigures agent={agents[0]} />}
            </Card>
          </li>
        )
      })}
    </ol>
  )
}

interface Metric {
  label: string
  value: ReactNode
  // The card's corner: a badge, or a team logo.
  action?: ReactNode
  // The line under the value, and a quieter one below it.
  detail?: ReactNode
  note?: string
}

function ContextBadge({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <Badge variant="outline" className="gap-1 whitespace-nowrap font-mono text-[11px] font-medium" style={style}>
      {children}
    </Badge>
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <Card className={cn("flex flex-col", SURFACE)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-bc-0 pb-3 short:p-4 short:pb-2">
        <div className="min-w-0 space-y-bc-3">
          <CardDescription className={EYEBROW}>{metric.label}</CardDescription>
          <p className="font-mono text-3xl font-bold leading-none tracking-bc-tight tabular-nums lg:text-4xl short:lg:text-2xl lg:leading-(--text-4xl--line-height) short:lg:leading-(--text-2xl--line-height)">
            {metric.value}
          </p>
        </div>
        {metric.action && <CardAction>{metric.action}</CardAction>}
      </CardHeader>
      {(metric.detail || metric.note) && (
        <CardFooter className="flex-col items-start gap-0.5 text-sm short:px-4 short:pb-3">
          {metric.detail && <p className="line-clamp-2 font-medium leading-snug">{metric.detail}</p>}
          {metric.note && <p className="text-muted-foreground">{metric.note}</p>}
        </CardFooter>
      )}
    </Card>
  )
}

const dollars = (n: number) => (
  <>
    $<CountUp value={Math.round(n)} playOnMount />
  </>
)

function liveMetrics(leaderboard: HackathonLeaderboard): Metric[] {
  const { totalVolume, tradingAgents, topPnl } = raceFigures(leaderboard.agents)
  return [
    {
      label: "Total Volume",
      value: dollars(totalVolume),
      action: <ContextBadge>{leaderboard.agents.length} agents</ContextBadge>,
      note: "Combined across the field",
    },
    {
      label: "Avg Volume per Agent",
      value: tradingAgents > 0 ? dollars(totalVolume / tradingAgents) : "—",
      action: <ContextBadge>{tradingAgents} trading</ContextBadge>,
      note: "Agents that have traded",
    },
    topPnlMetric(topPnl),
  ]
}

function topPnlMetric(topPnl: LeaderboardAgentRow | null): Metric {
  const color = topPnl && topPnl.pnlPercent >= 0 ? GAIN_COLOR : LOSS_COLOR
  const Trend = topPnl && topPnl.pnlPercent < 0 ? TrendingDown : TrendingUp
  return {
    label: "Top P&L",
    value: topPnl ? (
      <span style={{ color }}>
        <CountUp value={topPnl.pnlPercent} decimals={2} signed suffix="%" playOnMount />
      </span>
    ) : (
      "—"
    ),
    action: topPnl ? (
      <ContextBadge style={{ color }}>
        <Trend className="h-3 w-3" aria-hidden />
        {signedUsd(topPnl.pnlQuote)}
      </ContextBadge>
    ) : undefined,
    detail: topPnl?.strategyTitle,
    note: `Return on ${startingCapital} starting capital`,
  }
}

function finalMetrics(leaderboard: HackathonLeaderboard, teams: ResultTeam[]): Metric[] {
  const { totalVolume, tradingAgents, topPnl, maxVolume, volumeLeaders } = raceFigures(leaderboard.agents)
  const topTeams = leaderboard.teams.filter((t) => t.rank === 1)
  const winningTeams = topTeams.map((t) => teamOf(teams, t.teamId))
  const [totalVolumeMetric, avgVolumeMetric] = liveMetrics(leaderboard)
  return [
    totalVolumeMetric,
    avgVolumeMetric,
    {
      // Average volume per trading agent over its starting capital: how many
      // times over each agent turned its inventory.
      label: "Inventory Turnover",
      value:
        tradingAgents > 0 ? (
          <CountUp value={totalVolume / tradingAgents / STARTING_CAPITAL_QUOTE} decimals={1} suffix="×" playOnMount />
        ) : (
          "—"
        ),
      action: <ContextBadge>{startingCapital} each</ContextBadge>,
      note: "Average volume over starting capital",
    },
    {
      label: "Highest Volume",
      value: volumeLeaders.length > 0 ? dollars(maxVolume) : "—",
      detail: joinNames(volumeLeaders.map((a) => a.strategyTitle)),
      note: "Most traded in the race",
    },
    topPnlMetric(topPnl),
    {
      label: winningTeams.length > 1 ? "Winning Teams" : "Winning Team",
      value:
        winningTeams.length > 0 ? (
          <span className="block font-sans text-2xl leading-tight tracking-bc-tight lg:text-3xl lg:leading-(--text-3xl--line-height)">
            {joinNames(winningTeams.map((t) => t.name))}
          </span>
        ) : (
          "—"
        ),
      action: (
        <span className="inline-flex gap-2">
          {winningTeams.map((team) => (
            <TeamLogoBadge
              key={team.id}
              logoUrl={team.logoUrl}
              logoUrlDark={team.logoUrlDark}
              alt=""
              className="h-10 w-10 flex-shrink-0 rounded-bc-lg"
              imageSize={22}
              iconClassName="h-5 w-5"
            />
          ))}
        </span>
      ),
      detail: topTeams.length > 0 ? `${formatPoints(topTeams[0].score)} pts` : undefined,
      note: "Highest combined team score",
    },
  ]
}

/**
 * The race's figures as cards. `live` is the three that mean something while
 * the race runs; `final` adds inventory turnover, the volume leader and the
 * winning team.
 */
export function RaceMetrics({
  leaderboard,
  teams,
  variant,
}: {
  leaderboard: HackathonLeaderboard
  teams: ResultTeam[]
  variant: "live" | "final"
}) {
  const metrics = variant === "live" ? liveMetrics(leaderboard) : finalMetrics(leaderboard, teams)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 short:gap-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </div>
  )
}

/**
 * A finished race: the top three finishers over the race's figures. Shared by
 * the hackathon page and the home page. `provisional` marks results that are
 * still being finalized.
 */
export function RaceResults({
  leaderboard,
  teams,
  hackathonSlug,
  provisional = false,
}: {
  leaderboard: HackathonLeaderboard
  teams: ResultTeam[]
  hackathonSlug: string
  provisional?: boolean
}) {
  return (
    <div className="space-y-bc-10 text-left short:space-y-bc-3">
      <section aria-labelledby="top-finishers">
        <div className="mb-4 flex flex-wrap items-center gap-3 short:mb-2">
          <h3 id="top-finishers" className={EYEBROW}>
            Top Finishers
          </h3>
          {provisional && (
            <Badge variant="outline" className="border-warning/50 bg-warning/10 font-mono text-[11px] font-medium text-warning">
              Provisional · results pending
            </Badge>
          )}
        </div>
        <Podium leaderboard={leaderboard} teams={teams} hackathonSlug={hackathonSlug} />
      </section>
      <section aria-labelledby="race-figures">
        <h3 id="race-figures" className={cn(EYEBROW, "mb-4 short:mb-2")}>
          Race Figures
        </h3>
        <RaceMetrics leaderboard={leaderboard} teams={teams} variant="final" />
      </section>
    </div>
  )
}
