"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity, ArrowRight, CheckCircle2, Flag } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { TeamColorCard } from "@/botcamp/components/hackathons/TeamColorCard"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { ShareRaceButtons } from "@/botcamp/components/hackathons/ShareRaceButtons"
import { cn } from "@/botcamp/lib/utils"
import { useRefreshWhen } from "@/botcamp/hooks/useRefreshWhen"

interface RacingTeam {
  name: string
  primaryColor: string
  logoUrl: string | null
  logoUrlDark: string | null
}

export interface ChecklistItem {
  text: string
  /** Optional button under the text, e.g. joining Discord. */
  action?: { label: string; href: string; external?: boolean }
}

export interface HubStanding {
  /** Place on the board (1..n) — what the row shows as "4", even through ties. */
  position: number
  /** The viewer's own agent. */
  isYou?: boolean
  rank: number
  title: string
  driver: string | null
  color: string
  pnlPercent: number
  href: string
}

export interface HubYourStanding {
  /** Null until the builder's bot is on the board. */
  rank: number | null
  of: number
  /** Null until Condor has reported this bot's metrics. */
  pnlPercent: number | null
  volumeQuote: number | null
  /** Agent detail page; null while the bot isn't registered yet. */
  href: string | null
}

interface HubRaceCountdownProps {
  /** ISO time the countdown runs to (raceStart in Countdown, raceEnd when Live).
   *  Omitted after the race — the card then shows no clock. */
  target?: string
  /** Live race window (ISO). When set, the clock counts race hours (47:59:59)
   *  instead of days, with "Hour N of M" under it. */
  raceClock?: { start: string; end: string }
  /** Eyebrow above the headline, e.g. "Race starts in". */
  label: string
  /** Eyebrow once the target has passed (the digits hide then). */
  reachedLabel: string
  headline: string
  /** Human date, e.g. "Oct 10 at 15:00 UTC". */
  targetLabel: string
  detail: string
  /** Set when the builder's agent was selected — renders in that team's colors. */
  team?: RacingTeam | null
  /** The race is over: the team line reads in the past tense. */
  finished?: boolean
  /** Short "before the start" checklist for a selected builder. */
  checklist?: ChecklistItem[]
  /** Live: the builder's own agent on the board. */
  yourStanding?: HubYourStanding | null
  /** Live: the top of the board, for builders who aren't racing — the
   *  leader up top, the chasers beside the share links. */
  topStandings?: HubStanding[]
  primaryCta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  share: { text: string; path: string; label: string }
}

function getParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    totalHours: Math.floor(total / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

const signedPercent = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`

function Digits({
  remaining,
  onColor,
  raceHours,
}: {
  remaining: number | null
  onColor: boolean
  /** Count in race hours instead of days. */
  raceHours: boolean
}) {
  const parts = getParts(remaining ?? 0)
  const units = raceHours
    ? [
        { label: "Hours", value: parts.totalHours },
        { label: "Min", value: parts.minutes },
        { label: "Sec", value: parts.seconds },
      ]
    : [
        { label: "Days", value: parts.days },
        { label: "Hours", value: parts.hours },
        { label: "Min", value: parts.minutes },
        { label: "Sec", value: parts.seconds },
      ]
  return (
    <div className="flex gap-2 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.label}
          className={cn(
            "flex w-16 flex-col items-center rounded-bc-lg border py-3 sm:w-20",
            onColor ? "border-white/25 bg-black/25" : "border-border bg-background/60"
          )}
        >
          <span
            className={cn(
              "font-mono text-3xl font-bold tabular-nums sm:text-4xl",
              onColor && "text-white"
            )}
          >
            {remaining === null ? "--" : pad(u.value)}
          </span>
          <span
            className={cn(
              "mt-1 font-mono text-[10px] uppercase tracking-[0.14em]",
              onColor ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {u.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The hub's headline while the race is next or running. A selected builder
 * gets it in their team's colors with a "get ready" checklist; everyone else
 * gets a spectator version that points them at the race. Both can share.
 */
export function HubRaceCountdown({
  target,
  raceClock,
  label,
  reachedLabel,
  headline,
  targetLabel,
  detail,
  team,
  finished = false,
  checklist,
  yourStanding,
  topStandings,
  primaryCta,
  secondaryCta,
  share,
}: HubRaceCountdownProps) {
  // Null until mounted: the server can't know the viewer's clock.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // The race clock never shows more than the race's own length: a stage set
  // to Live before Race Start holds at the full duration.
  const clockNow = now !== null && raceClock ? Math.max(now, new Date(raceClock.start).getTime()) : now
  const remaining = clockNow === null || !target ? null : new Date(target).getTime() - clockNow
  const reached = remaining !== null && remaining <= 0
  // At zero the server moves the stage; refresh to show it.
  useRefreshWhen(reached)
  const onColor = !!team
  const chasers = topStandings?.slice(1) ?? []

  let progress: { hour: number; of: number } | null = null
  if (raceClock && now !== null) {
    const start = new Date(raceClock.start).getTime()
    const end = new Date(raceClock.end).getTime()
    const span = Math.max(1, end - start)
    const elapsed = Math.min(Math.max(now - start, 0), span)
    const of = Math.max(1, Math.round(span / 3_600_000))
    progress = { hour: Math.min(of, Math.floor(elapsed / 3_600_000) + 1), of }
  }

  const body = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-bc-3">
          <p
            className={cn(
              "inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em]",
              onColor ? "text-white/90" : "text-primary"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full motion-safe:animate-pulse",
                onColor ? "bg-white" : "bg-primary"
              )}
            />
            {reached ? reachedLabel : label} · {targetLabel}
          </p>
          <h2 className={cn("text-3xl font-bold tracking-[-0.03em] md:text-4xl", onColor && "text-white")}>
            {headline}
          </h2>
          {team && (
            <div className="flex items-center gap-3">
              <TeamLogoBadge
                logoUrl={team.logoUrl}
                logoUrlDark={team.logoUrlDark}
                alt={team.name}
                className="h-10 w-10 shrink-0 rounded-bc-lg"
                imageSize={26}
              />
              <p className="text-lg font-semibold text-white">{finished ? `You raced for ${team.name}` : `You're racing for ${team.name}`}
              </p>
            </div>
          )}
          <p className={cn("max-w-xl text-sm", onColor ? "text-white/80" : "text-muted-foreground")}>
            {detail}
          </p>
        </div>

        {target && !reached && (
          <div className="space-y-bc-2">
            <Digits remaining={remaining} onColor={onColor} raceHours={!!raceClock} />
            {progress && (
              <p
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.14em]",
                  onColor ? "text-white/70" : "text-muted-foreground"
                )}
              >
                Hour {progress.hour} of {progress.of}
              </p>
            )}
          </div>
        )}
      </div>

      {topStandings && topStandings.length > 0 && (
        <ol
          className={cn(
            "divide-y rounded-bc-lg border",
            onColor ? "divide-white/20 border-white/20 bg-black/20 text-white" : "divide-border border-border bg-background/60"
          )}
        >
          {topStandings.slice(0, 1).map((row) => (
            <li key={row.href}>
              <Link
                href={row.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 transition-colors",
                  onColor ? "hover:bg-white/10" : "hover:bg-primary/5"
                )}
              >
                <span className="w-8 font-mono text-sm font-bold tabular-nums">{row.position}</span>
                <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: row.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {row.title}
                    {row.isYou && (
                      <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">You</span>
                    )}
                  </span>
                  {row.driver && (
                    <span className={cn("block truncate text-xs", onColor ? "text-white/70" : "text-muted-foreground")}>
                      {row.driver}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-semibold tabular-nums",
                    row.pnlPercent >= 0 ? "text-success" : "text-error"
                  )}
                >
                  {signedPercent(row.pnlPercent)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {checklist && checklist.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-3">
          {checklist.map((item) => (
            <li
              key={item.text}
              className="flex flex-col gap-3 rounded-bc-lg border border-white/20 bg-black/20 p-3 text-sm text-white/90"
            >
              <span className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                {item.text}
              </span>
              {item.action && (
                <Button asChild size="sm" className="mt-auto self-start bg-white text-black hover:bg-white/90">
                  <a
                    href={item.action.href}
                    {...(item.action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {item.action.label}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "flex flex-col gap-4 md:flex-row md:justify-between",
          // Top-aligned when the left column has content, so it lines up
          // with the share block; otherwise the CTAs sit on the baseline.
          yourStanding || chasers.length > 0 ? "md:items-start" : "md:items-end",
          // P2–P5 continue the leader's list, so they sit tight under P1.
          chasers.length > 0 && "-mt-4"
        )}
      >
        <div className="space-y-bc-3">
          {yourStanding && chasers.length === 0 && (
            <div className="space-y-bc-2">
              {/* Same eyebrow as ShareRaceButtons' label, so the rows align. */}
              <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                <Activity className="h-3 w-3" />
                Your race
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "Position",
                    value:
                      yourStanding.rank === null
                        ? "—"
                        : `#${yourStanding.rank}${yourStanding.of > 0 ? `/${yourStanding.of}` : ""}`,
                  },
                  {
                    label: "P&L",
                    value: yourStanding.pnlPercent === null ? "—" : signedPercent(yourStanding.pnlPercent),
                  },
                  {
                    label: "Volume",
                    value: yourStanding.volumeQuote === null ? "—" : usdCompact.format(yourStanding.volumeQuote),
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-[5.5rem] rounded-bc-md border border-white/20 bg-black/20 px-3 py-1.5"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/70">{stat.label}</p>
                    <p className="font-mono text-base font-bold tabular-nums text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
              {yourStanding.pnlPercent === null ? (
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">
                  Waiting for your bot&apos;s first report
                </p>
              ) : (
                yourStanding.href && (
                  <Link
                    href={yourStanding.href}
                    className="text-xs font-medium text-white/80 underline-offset-2 hover:underline"
                  >
                    Your agent&apos;s stats →
                  </Link>
                )
              )}
            </div>
          )}
          {chasers.length > 0 && (
            <ol className="w-full space-y-bc-2 md:w-[32rem]">
              {/* The podium chasers (P2–P3) run full width; P4–P5 step in. The
                  viewer's own agent, when it finished off the podium, follows a gap. */}
              {chasers.map((row, i) => (
                <li
                  key={row.href}
                  className={cn(
                    i >= 2 && !row.isYou && "md:w-[26rem]",
                    row.isYou && i > 0 && row.position > chasers[i - 1].position + 1 && "pt-3"
                  )}
                >
                  <Link
                    href={row.href}
                    className={cn(
                      "flex items-center gap-3 rounded-bc-lg border px-4 py-3 text-sm transition-colors",
                      onColor
                        ? "border-white/20 bg-black/20 text-white hover:bg-white/10"
                        : "border-border bg-background/40 hover:bg-primary/5",
                      row.isYou && (onColor ? "border-white/60 bg-white/15" : "border-primary/60 bg-primary/10")
                    )}
                  >
                    <span
                      className={cn(
                        "w-8 font-mono text-sm font-bold tabular-nums",
                        onColor ? "text-white/70" : "text-muted-foreground"
                      )}
                    >
                      {row.position}
                    </span>
                    <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{row.title}</span>
                      {row.isYou && (
                        <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">You</span>
                      )}
                      {row.driver && (
                        <span className={onColor ? "text-white/70" : "text-muted-foreground"}> · {row.driver}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold tabular-nums",
                        row.pnlPercent >= 0 ? "text-success" : "text-error"
                      )}
                    >
                      {signedPercent(row.pnlPercent)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild className={onColor ? "bg-white text-black hover:bg-white/90" : undefined}>
              <Link href={primaryCta.href}>
                <Flag className="mr-1.5 h-4 w-4" />
                {primaryCta.label}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            {secondaryCta && (
              <Button
                asChild
                variant="outline"
                className={
                  onColor ? "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" : undefined
                }
              >
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        </div>
        {/* Beside the chasers, a rule runs from the end of their column to
            the edge, with the share block under it. */}
        <div
          className={cn(
            // Stretches to the row's height: the builder's numbers sit under the
            // rule, the share block in the bottom-right corner.
            chasers.length > 0 &&
              "border-t pt-4 md:flex md:flex-1 md:flex-col md:items-end md:justify-between md:gap-6 md:self-stretch",
            onColor ? "border-white/20" : "border-border"
          )}
        >
          {yourStanding && chasers.length > 0 && (
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  label: "Position",
                  value:
                    yourStanding.rank === null
                      ? "—"
                      : `#${yourStanding.rank}${yourStanding.of > 0 ? `/${yourStanding.of}` : ""}`,
                },
                {
                  label: "P&L",
                  value: yourStanding.pnlPercent === null ? "—" : signedPercent(yourStanding.pnlPercent),
                },
                {
                  label: "Volume",
                  value: yourStanding.volumeQuote === null ? "—" : usdCompact.format(yourStanding.volumeQuote),
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-bc-lg border border-white/20 bg-black/20 px-4 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/70">{stat.label}</p>
                  <p className="font-mono text-lg font-bold tabular-nums text-white">{stat.value}</p>
                </div>
              ))}
              {yourStanding.href && (
                <Link
                  href={yourStanding.href}
                  className="flex items-center justify-center gap-1 rounded-bc-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Your agent&apos;s stats
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
          <ShareRaceButtons
            text={share.text}
            path={share.path}
            label={share.label}
            tone={onColor ? "onColor" : "default"}
            align={chasers.length > 0 ? "end" : "start"}
            size={chasers.length > 0 ? "lg" : "sm"}
          />
        </div>
      </div>
    </div>
  )

  if (team) {
    return (
      <TeamColorCard primaryColor={team.primaryColor} contentClassName="p-6 md:p-8">
        {body}
      </TeamColorCard>
    )
  }

  return <section className="rounded-bc-xl border border-primary/40 bg-primary/5 p-6 md:p-8">{body}</section>
}
