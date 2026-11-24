"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { FastForward, Pause, Play, RotateCcw } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Slider } from "@/botcamp/components/ui/slider"
import { cn } from "@/botcamp/lib/utils"

// The whole race plays in this long at 1×.
export const REPLAY_MS = 20_000
const SPEEDS = [1, 2, 4] as const
// Capped, so a tab that was in the background picks up where it was instead
// of jumping to the finish.
const MAX_FRAME_MS = 100

export interface ReplayClock {
  hour: number
  endHour: number
  playing: boolean
  speed: number
  setHour: (hour: number) => void
  toggle: () => void
  restart: () => void
  skipToEnd: () => void
  setSpeed: (speed: number) => void
}

/**
 * A race replay's clock, in hours since the start. Starts at `endHour` (the
 * finish, or now mid-race), which is what the server renders. `autoplay`
 * rewinds and plays once on mount (`true`), or once the element scrolls into
 * view (a ref). Reduced motion never autoplays.
 */
export function useReplayClock({
  endHour,
  raceHours,
  autoplay,
}: {
  endHour: number
  raceHours: number
  autoplay: boolean | RefObject<HTMLElement | null>
}): ReplayClock {
  const [hour, setHourState] = useState(endHour)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const hourRef = useRef(hour)

  const setHour = useCallback(
    (h: number) => {
      const clamped = Math.min(Math.max(h, 0), endHour)
      hourRef.current = clamped
      setHourState(clamped)
    },
    [endHour],
  )

  const restart = useCallback(() => {
    setHour(0)
    setPlaying(true)
  }, [setHour])

  const skipToEnd = useCallback(() => {
    setPlaying(false)
    setHour(endHour)
  }, [setHour, endHour])

  useEffect(() => {
    if (autoplay === false || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    if (autoplay === true) return restart()
    const target = autoplay.current
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        restart()
      },
      { threshold: 0.35 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [autoplay, restart])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const elapsed = Math.min(now - last, MAX_FRAME_MS)
      const next = hourRef.current + (elapsed / REPLAY_MS) * raceHours * speed
      last = now
      setHour(next)
      if (next >= endHour) {
        setPlaying(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, raceHours, endHour, setHour])

  const toggle = useCallback(() => {
    if (playing) return setPlaying(false)
    if (hourRef.current >= endHour) setHour(0)
    setPlaying(true)
  }, [playing, endHour, setHour])

  return { hour, endHour, playing, speed, setHour, toggle, restart, skipToEnd, setSpeed }
}

function clockLabel(hour: number, endHour: number, live: boolean): string {
  if (hour >= endHour) return live ? "Now" : "Final"
  const minutes = Math.floor(hour * 60)
  return `T+${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

const utcTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
})

/** Play, pause, restart, scrub and speed, with the race clock. */
export function ReplayControls({
  clock,
  raceStart,
  live,
  color,
  className,
}: {
  clock: ReplayClock
  raceStart: string
  live: boolean
  // The accent (hex), e.g. the team color.
  color: string
  className?: string
}) {
  const { hour, endHour, playing, speed, setHour, toggle, restart, skipToEnd, setSpeed } = clock
  const wallClock = utcTime.format(new Date(Date.parse(raceStart) + hour * 3_600_000))
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3", className)}>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={toggle}
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="h-9 w-9 border-2"
          style={{ borderColor: color }}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={skipToEnd}
          disabled={hour >= endHour}
          aria-label="Skip to the end"
          className="h-9 w-9"
        >
          <FastForward className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={restart} aria-label="Restart replay" className="h-9 w-9">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-w-[7.5rem]">
        <div className="font-mono text-lg font-bold tabular-nums leading-none">{clockLabel(hour, endHour, live)}</div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">{wallClock} UTC</div>
      </div>
      <Slider
        value={[hour]}
        min={0}
        max={endHour}
        step={0.05}
        onValueChange={([h]) => setHour(h)}
        aria-label="Race time"
        color={color}
        className="order-last basis-full sm:order-none sm:basis-auto sm:flex-1"
      />
      <div className="flex items-center rounded-bc-md border border-border p-0.5" role="group" aria-label="Replay speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            aria-pressed={speed === s}
            className={cn(
              "rounded px-2 py-1 font-mono text-xs font-bold tabular-nums transition-colors",
              speed === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * A replay as a card: the controls along the top, with an optional figure
 * that follows the clock beside them (`aside`), over whatever it replays.
 * `boxRef` is what an autoplaying clock watches scroll into view.
 */
export function ReplayPlayer({
  clock,
  raceStart,
  live,
  color,
  aside,
  boxRef,
  children,
}: {
  clock: ReplayClock
  raceStart: string
  live: boolean
  // The accent (hex), e.g. the team color.
  color: string
  aside?: ReactNode
  boxRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  return (
    <div ref={boxRef} className="rounded-bc-xl border border-border bg-card/80 backdrop-blur-xs">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border p-4 md:px-5">
        <ReplayControls
          clock={clock}
          raceStart={raceStart}
          live={live}
          color={color}
          className="min-w-0 flex-1 basis-[28rem]"
        />
        {aside}
      </div>
      {children}
    </div>
  )
}

/** A headline figure beside the replay controls, e.g. the field's volume. */
export function ReplayFigure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sm:text-right">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="font-mono text-2xl md:text-3xl font-bold tabular-nums leading-tight text-primary md:leading-(--text-3xl--line-height)">{children}</div>
    </div>
  )
}
