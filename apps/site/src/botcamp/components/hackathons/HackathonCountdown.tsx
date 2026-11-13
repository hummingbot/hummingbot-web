"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { cn } from "@/botcamp/lib/utils"
import { fmtFull, isRegistrationOpen } from "@/botcamp/lib/hackathon-stages"
import { useRefreshWhen } from "@/botcamp/hooks/useRefreshWhen"

interface HackathonCountdownProps {
  title: string
  subtitle: string
  /** Hackathon.status — the admin-selected stage decides what the hero shows. */
  stage: string
  registrationStart: string | null
  registrationEnd: string | null
  /** When the live race begins — the Countdown stage counts down to it.
   *  Null until Race Start or the finals session is set. */
  raceStart: string | null
  /** When the live race ends — the Live stage counts down to it. */
  raceEnd: string | null
  registerHref: string
}

type HeroMode =
  // `race`: the live race, counted in race hours (47:59:59) rather than days.
  | { kind: "timer"; target: Date; chip: string; barLabel: string; race?: boolean }
  | { kind: "static"; chip: string }

function getHeroMode(props: HackathonCountdownProps, now: Date | null): HeroMode {
  switch (props.stage) {
    case "COMING_SOON":
      // No clock before registration — just the announcement and, if set, the date.
      return {
        kind: "static",
        chip: props.registrationStart
          ? `Coming Soon · Registration Opens ${fmtFull(new Date(props.registrationStart))}`
          : "Coming Soon",
      }
    case "REGISTRATION":
      if (!isRegistrationOpen({ status: props.stage, registrationEnd: props.registrationEnd }, now ?? undefined)) {
        return { kind: "static", chip: "Registration Closed" }
      }
      return {
        kind: "static",
        chip: props.registrationEnd
          ? `Registration Open · Apply by ${fmtFull(new Date(props.registrationEnd))}`
          : "Registration Open",
      }
    case "COUNTDOWN": {
      if (!props.raceStart) return { kind: "static", chip: "Race Date To Be Announced" }
      const start = new Date(props.raceStart)
      // Race time reached before the admin switches to Live — don't sit on 00:00:00.
      if (now && now >= start) return { kind: "static", chip: "Race Starting · Stand By" }
      return { kind: "timer", target: start, chip: "Competition Starts In", barLabel: "Starts in" }
    }
    case "ACTIVE": {
      if (!props.raceEnd) return { kind: "static", chip: "Live Now" }
      const end = new Date(props.raceEnd)
      // Race clock ran out before the admin moved to Judging.
      if (now && now >= end) return { kind: "static", chip: "Race Finished · Results Coming" }
      return { kind: "timer", target: end, chip: "Live Now · Time Remaining", barLabel: "Live · Ends in", race: true }
    }
    case "JUDGING":
      return { kind: "static", chip: "Race Finished · Results Pending" }
    default:
      return { kind: "static", chip: "Race Finished · Winners Announced" }
  }
}

function getTimeParts(target: Date, now: Date) {
  const diffMs = Math.max(0, target.getTime() - now.getTime())
  return {
    days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diffMs / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diffMs / (1000 * 60)) % 60),
    totalHours: Math.floor(diffMs / (1000 * 60 * 60)),
    seconds: Math.floor((diffMs / 1000) % 60),
  }
}

const HERO_EYEBROW: Record<string, string> = {
  COMING_SOON: "Trading Competition · Coming Soon",
  REGISTRATION: "Trading Competition · Now Open",
  COUNTDOWN: "Trading Competition · Starting Soon",
  ACTIVE: "Live Trading Competition",
}

const TEXT_SHADOW = "0 4px 24px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.6)"
const FLIP_MS = 220

// Intro spin: every digit flips at least one full turn of the wheel and lands
// on its real value. Digits land in a quick left-to-right cascade, the last
// one by INTRO_BASE_MS + 5 × INTRO_STAGGER_MS (~1.4s), however big the numbers.
const INTRO_BASE_MS = 1100
const INTRO_STAGGER_MS = 60

interface Flap {
  from: string
  ms: number
  // Remounts the flap so the flip animation replays on every step.
  key: number
}

/**
 * One split-flap digit tile. When the real time first arrives client-side it
 * spins through the wheel like a flip calendar and lands on the digit; after
 * that it flips once in place whenever the countdown ticks it over.
 */
function FlipDigit({ digit, ready, index }: { digit: string; ready: boolean; index: number }) {
  const [displayed, setDisplayed] = useState(digit)
  const [flap, setFlap] = useState<Flap | null>(null)
  // Cards render blank until the spin starts. The server doesn't know the
  // viewer's clock, so its markup would otherwise sit on "00 00 00" for a
  // beat before hydration kicks the intro off.
  const [showDigit, setShowDigit] = useState(false)
  const introStartedRef = useRef(false)
  // State, not a ref: the live-update effect below must rerun when the intro
  // lands, in case the digit changed while it was spinning.
  const [introDone, setIntroDone] = useState(false)

  // One-time intro spin, once the real value is known client-side.
  useEffect(() => {
    if (!ready || introStartedRef.current) return
    introStartedRef.current = true
    const target = Number(digit)
    if (Number.isNaN(target) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
      setDisplayed(digit)
      setShowDigit(true)
      setIntroDone(true)
      return
    }

    // Count up from 0 through one full turn, then on to the target.
    const flips = 10 + target
    const stepMs = (INTRO_BASE_MS + index * INTRO_STAGGER_MS) / flips
    const flipMs = Math.max(40, stepMs * 0.85)
    let step = 0
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const from = step % 10
      step += 1
      // The card underneath shows the next value at once; the flap carrying
      // the old one folds away over it.
      setDisplayed(String(step % 10))
      setFlap({ from: String(from), ms: flipMs, key: step })
      if (step < flips) {
        timer = setTimeout(tick, stepMs)
      } else {
        timer = setTimeout(() => {
          setFlap(null)
          setIntroDone(true)
        }, flipMs)
      }
    }

    setDisplayed("0")
    setShowDigit(true)
    timer = setTimeout(tick, stepMs)
    return () => clearTimeout(timer)
    // Intentionally runs once — captures the real digit the moment `ready` flips true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Live updates after the intro has landed (e.g. a minute ticking over).
  useEffect(() => {
    if (!introDone || digit === displayed) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setFlap({ from: displayed, ms: FLIP_MS, key: Date.now() })
    setDisplayed(digit)
    const t = setTimeout(() => setFlap(null), FLIP_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digit, introDone])

  return (
    <div
      className="relative w-12 h-16 sm:w-16 sm:h-20 md:w-20 md:h-24 flex-shrink-0"
      style={{ perspective: "400px" }}
    >
      {/* Resting card underneath — already showing the value being flipped to */}
      <div className={TILE_CLASS}>
        <span className={DIGIT_CLASS} aria-hidden={!showDigit}>
          {showDigit ? displayed : "\u00a0"}
        </span>
      </div>
      {/* Calendar hinge across the middle of the card */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-black z-20 pointer-events-none" />

      {/* Flap carrying the outgoing digit, folding away to reveal the card underneath */}
      {flap && (
        <div
          key={flap.key}
          className={`${TILE_CLASS} animate-flip-down [backface-visibility:hidden] z-10`}
          style={{ animationDuration: `${flap.ms}ms` }}
        >
          <span className={DIGIT_CLASS}>{flap.from}</span>
        </div>
      )}
    </div>
  )
}

// Flip-calendar card, translucent so the hero video reads through it. The top
// half sits a shade lighter than the bottom, like a page catching the light
// above the hinge.
const TILE_CLASS =
  "absolute inset-0 flex items-center justify-center rounded-bc-lg border border-white/15 bg-[linear-gradient(to_bottom,rgba(40,40,42,0.7)_0%,rgba(40,40,42,0.7)_50%,rgba(20,20,21,0.75)_50%,rgba(20,20,21,0.75)_100%)] backdrop-blur-xs shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]"
const DIGIT_CLASS = "font-mono text-4xl sm:text-5xl md:text-6xl font-bold text-white tabular-nums leading-none sm:leading-(--text-5xl--line-height) md:leading-(--text-6xl--line-height)"

function TimerUnit({
  label,
  value,
  ready,
  unitIndex,
}: {
  label: string
  value: number
  ready: boolean
  // Position of this unit (0 = days) — staggers the intro cascade across all six digits.
  unitIndex: number
}) {
  const digits = String(value).padStart(2, "0").split("")
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <div className="flex gap-1 sm:gap-1.5">
        {digits.map((d, i) => (
          <FlipDigit key={i} digit={d} ready={ready} index={unitIndex * 2 + i} />
        ))}
      </div>
      <span
        className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] text-white/65"
        style={{ textShadow: TEXT_SHADOW }}
      >
        {label}
      </span>
    </div>
  )
}

export const pad = (n: number) => String(n).padStart(2, "0")

export type RacePhase = "upcoming" | "live" | "ended"

/**
 * Ticking time to the finals: counts down to the start, then to the end once
 * the race is live, then stops at "ended". `ready` is false until the first
 * client-side tick — the server can't know the viewer's clock.
 */
export function useFinalsCountdown(competitionStart: string, competitionEnd: string) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const ready = now !== null
  const competitionStartDate = new Date(competitionStart)
  const competitionEndDate = new Date(competitionEnd)
  const phase: RacePhase =
    now && now > competitionEndDate ? "ended" : now && now >= competitionStartDate ? "live" : "upcoming"
  const target = phase === "live" ? competitionEndDate : competitionStartDate
  const { days, hours, minutes } =
    now && phase !== "ended" ? getTimeParts(target, now) : { days: 0, hours: 0, minutes: 0 }
  return { ready, phase, days, hours, minutes }
}

/**
 * Compact countdown pinned under the site header once the hero has scrolled
 * away, so the time to the finals stays in view down the whole page.
 */
function CompactCountdownBar({
  title,
  visible,
  label,
  value,
}: {
  title: string
  visible: boolean
  label: string
  value: string
}) {
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-16 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 h-11 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
          <span className="text-sm font-semibold tracking-bc-tight text-foreground truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs sm:text-sm tabular-nums flex-shrink-0">
          <span className="uppercase tracking-[0.14em] text-muted-foreground text-[10px] sm:text-[11px]">
            {label}
          </span>
          <span className="font-bold text-amber-700 dark:text-botcamp-amber">
            {value}
          </span>
        </div>
      </div>
    </div>
  )
}

const PHASE_BADGE: Record<RacePhase, string> = {
  upcoming: "Competition Starts In",
  live: "Live Now · Time Remaining",
  ended: "Finals Complete",
}

/** The time to the finals at card size, for the builder hub's Calendar tab. */
export function CompactHackathonCountdown({
  competitionStart,
  competitionEnd,
}: {
  /** FinalsWindow.start — when the live race begins. */
  competitionStart: string
  /** FinalsWindow.end — when the live race ends. */
  competitionEnd: string
}) {
  const { ready, phase, days, hours, minutes } = useFinalsCountdown(competitionStart, competitionEnd)
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="inline-flex items-center rounded-full border border-botcamp-amber/40 bg-botcamp-amber/15 px-3 py-1 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-botcamp-amber">
        {PHASE_BADGE[phase]}
      </span>
      {phase !== "ended" && (
        <div className="flex items-start justify-center gap-4 sm:gap-5">
          {[
            { label: "Days", value: days },
            { label: "Hours", value: hours },
            { label: "Minutes", value: minutes },
          ].map((u) => (
            <div key={u.label} className="flex flex-col items-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-bold tabular-nums">{ready ? pad(u.value) : "--"}</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {u.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** The hero's call to action — one look in every stage: gold glow, arrow. */
function HeroCta({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Button
      asChild
      size="lg"
      className={cn(
        "group h-12 px-8 text-base font-semibold shadow-[0_0_32px_-6px_hsl(var(--primary)/0.6)] transition-shadow hover:shadow-[0_0_44px_-4px_hsl(var(--primary)/0.8)]",
        className,
      )}
    >
      <Link href={href}>
        {children}
        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Button>
  )
}

// How far down the page (as a share of the viewport) the compact bar appears
// — just after the hero copy has faded out.
const COMPACT_BAR_THRESHOLD = 0.6

/**
 * Centered hero overlay for the hackathon hero video: eyebrow, title and
 * subtitle directly over the video (hence the text-shadow), then a
 * flip-calendar countdown with one translucent card per digit. As the page
 * scrolls, the copy lifts away (`.sd-hero-copy`) and a compact countdown bar
 * takes over under the header.
 */
export function HackathonCountdown(props: HackathonCountdownProps) {
  const { title, subtitle, stage, registerHref } = props
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const [showBar, setShowBar] = useState(false)
  useEffect(() => {
    const update = () => setShowBar(window.scrollY > window.innerHeight * COMPACT_BAR_THRESHOLD)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  const ready = now !== null
  // Once the race is over the sections below carry the dates and results.
  const postRace = stage === "JUDGING" || stage === "COMPLETED"
  const mode = getHeroMode(props, now)
  // The race clock hit zero: the server advances the stage on its own, so
  // pull the new stage in rather than sitting on "Stand By".
  const clockRanOut =
    !!now &&
    ((stage === "COUNTDOWN" && !!props.raceStart && now >= new Date(props.raceStart)) ||
      (stage === "ACTIVE" && !!props.raceEnd && now >= new Date(props.raceEnd)))
  useRefreshWhen(clockRanOut)
  const canRegister = isRegistrationOpen(
    { status: stage, registrationEnd: props.registrationEnd },
    now ?? undefined,
  )
  const isRaceClock = mode.kind === "timer" && !!mode.race
  // The live race reads as its own clock — "Hour 3 of 48" under the timer.
  // Only read while the race clock shows, which needs both dates.
  const raceStartMs = props.raceStart ? new Date(props.raceStart).getTime() : 0
  const raceEndMs = props.raceEnd ? new Date(props.raceEnd).getTime() : 0
  // The race clock never shows more than the race's own length: a stage set
  // to Live before Race Start holds at the full duration instead of counting
  // the weeks until Race End.
  const clockNow = now && isRaceClock ? new Date(Math.max(now.getTime(), raceStartMs)) : now
  const { days, hours, minutes, totalHours, seconds } =
    clockNow && mode.kind === "timer"
      ? getTimeParts(mode.target, clockNow)
      : { days: 0, hours: 0, minutes: 0, totalHours: 0, seconds: 0 }
  const raceHours = Math.max(1, Math.round((raceEndMs - raceStartMs) / 3_600_000))
  const elapsedMs = now ? Math.min(Math.max(now.getTime() - raceStartMs, 0), raceEndMs - raceStartMs) : 0
  const raceHour = Math.min(raceHours, Math.floor(elapsedMs / 3_600_000) + 1)

  return (
    <>
      {mode.kind === "timer" && (
        <CompactCountdownBar
          title={title}
          visible={showBar}
          label={mode.barLabel}
          value={
            isRaceClock
              ? `${pad(totalHours)}H ${pad(minutes)}M ${pad(seconds)}S`
              : `${pad(days)}D ${pad(hours)}H ${pad(minutes)}M`
          }
        />
      )}
      <div className="sd-hero-copy flex flex-col items-center text-center">
        {!postRace && (
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            {/* The pulsing "live" dot only while the race is actually running. */}
            <span className={`h-1.5 w-1.5 rounded-full bg-primary ${stage === "ACTIVE" ? "animate-pulse" : ""}`} />
            <span
              className="font-mono text-[11px] sm:text-sm font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-primary"
              style={{ textShadow: TEXT_SHADOW }}
            >
              {HERO_EYEBROW[stage] ?? "Trading Competition"}
            </span>
          </div>
        )}

        <h1
          className="text-[clamp(2.75rem,8.5vw,9rem)] leading-[0.9] font-bold tracking-[-0.04em] text-balance text-white mb-5 sm:mb-6"
          style={{ textShadow: TEXT_SHADOW }}
        >
          {title}
        </h1>

        <p
          className="text-white/85 text-base sm:text-lg max-w-xl mb-5 sm:mb-6"
          style={{ textShadow: TEXT_SHADOW }}
        >
          {subtitle}
        </p>

        {!postRace && (
          <span className="inline-flex items-center rounded-full border border-botcamp-amber/40 bg-botcamp-amber/15 backdrop-blur-xs px-3 py-1 mb-3 sm:mb-4 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-botcamp-amber">
            {mode.chip}
          </span>
        )}

        {/* Flip-calendar countdown: one card per digit, grouped by unit */}
        {mode.kind === "timer" && !isRaceClock && (
          <div className="flex items-start justify-center gap-4 sm:gap-6 md:gap-8">
            <TimerUnit label="Days" value={days} ready={ready} unitIndex={0} />
            <TimerUnit label="Hours" value={hours} ready={ready} unitIndex={1} />
            <TimerUnit label="Minutes" value={minutes} ready={ready} unitIndex={2} />
          </div>
        )}

        {isRaceClock && (
          <>
            <div className="flex items-start justify-center gap-4 sm:gap-6 md:gap-8">
              <TimerUnit label="Hours" value={totalHours} ready={ready} unitIndex={0} />
              <TimerUnit label="Minutes" value={minutes} ready={ready} unitIndex={1} />
              <TimerUnit label="Seconds" value={seconds} ready={ready} unitIndex={2} />
            </div>
            <div className="mt-5">
              <p
                className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-white/70"
                style={{ textShadow: TEXT_SHADOW }}
              >
                Hour {raceHour} of {raceHours}
              </p>
            </div>
          </>
        )}

        {canRegister && (
          <HeroCta href={registerHref} className="mt-2">
            Register Now
          </HeroCta>
        )}

        {/* From the race on, the standings are the point of the page. */}
        {(stage === "ACTIVE" || stage === "JUDGING" || stage === "COMPLETED") && (
          <HeroCta
            href={stage === "COMPLETED" ? "#winners" : stage === "JUDGING" ? "#replay" : "#leaderboard"}
            className="mt-6"
          >
            {stage === "COMPLETED"
              ? "See the winners"
              : stage === "ACTIVE"
                ? "Watch the live standings"
                : "See the Replay"}
          </HeroCta>
        )}
      </div>
    </>
  )
}
