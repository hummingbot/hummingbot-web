"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { AgentSeriesChart, pointIndexAt } from "./AgentSeriesChart"
import { ReplayPlayer, useReplayClock, type ReplayClock } from "./ReplayClock"
import { Eyebrow } from "./AgentSectionTitle"
import { formatPoints } from "@/botcamp/lib/hackathon-leaderboard"
import { GAIN_COLOR, LOSS_COLOR } from "@/botcamp/lib/design-constants"
import { isReplayable, type ReplayData } from "@/botcamp/lib/agent-replay"

interface ReplayState {
  data: ReplayData
  clock: ReplayClock
  at: { rank: number; score: number; pnl: number; volume: number; started: boolean }
}

const ReplayContext = createContext<ReplayState | null>(null)

function useReplay(): ReplayState {
  const state = useContext(ReplayContext)
  if (!state) throw new Error("Replay components must be inside <AgentReplayProvider>")
  return state
}

/**
 * The replay clock for an agent's race: everything inside reads the agent's
 * standing at the clock's hour. Server-renders the finish, so the page reads
 * correctly without JS, then rewinds to the start and plays once on load.
 * Reduced motion keeps the finish.
 */
export function AgentReplayProvider({ data, children }: { data: ReplayData; children: ReactNode }) {
  const clock = useReplayClock({ endHour: data.endHour, raceHours: data.raceHours, autoplay: isReplayable(data) })
  const { hour } = clock

  const at = useMemo(() => {
    if (hour >= data.endHour) return { ...data.final, started: true }
    const point = data.series[pointIndexAt(data.series, hour)]
    const frame = data.frames[Math.max(0, pointIndexAt(data.frames, hour))]
    return {
      rank: frame.rank,
      score: frame.score,
      // Before its first reading an agent is where it started: no P&L, no volume.
      pnl: point?.pnl ?? 0,
      volume: point?.volume ?? 0,
      started: hour > 0,
    }
  }, [hour, data])

  const value = useMemo(() => ({ data, clock, at }), [data, clock, at])
  return <ReplayContext.Provider value={value}>{children}</ReplayContext.Provider>
}

const signedUsd = (v: number) => `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`

function Stat({ label, sub, children }: { label: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="p-5 md:p-6 min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <div className="text-2xl md:text-3xl font-bold tabular-nums font-mono truncate">{children}</div>
      {sub && <div className="mt-1 font-mono text-xs text-muted-foreground tabular-nums truncate">{sub}</div>}
    </div>
  )
}

/** The headline numbers at the replay's hour. */
export function ReplayStats() {
  const {
    at,
    data,
    clock: { hour },
  } = useReplay()
  const pnlPercent = (at.pnl / data.startingCapitalQuote) * 100
  const color = at.pnl >= 0 ? GAIN_COLOR : LOSS_COLOR
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 rounded-bc-xl border border-border bg-card/60 backdrop-blur-xs divide-x divide-y md:divide-y-0 divide-border overflow-hidden">
      <Stat
        label="Position"
        sub={hour === 0 ? "Starting grid" : `of ${data.fieldSize} · ${formatPoints(at.score)} pts`}
      >
        #{at.rank}
      </Stat>
      <Stat label="P&L" sub={signedUsd(at.pnl)}>
        <span style={{ color: at.started ? color : undefined }}>{pct(pnlPercent)}</span>
      </Stat>
      <Stat label="Equity" sub={`from $${data.startingCapitalQuote.toLocaleString("en-US")}`}>
        ${(data.startingCapitalQuote + at.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Stat>
      <Stat label="Volume" sub={`${(at.volume / data.startingCapitalQuote).toFixed(1)}× turnover`}>
        ${Math.round(at.volume).toLocaleString("en-US")}
      </Stat>
    </div>
  )
}

/** Play, pause, scrub and speed, over the agent's charts at the replay's hour. */
export function ReplayPanel() {
  const { data, clock } = useReplay()
  const { hour } = clock
  const equity = useMemo(
    () => data.series.map((p) => ({ hour: p.hour, value: data.startingCapitalQuote + p.pnl })),
    [data],
  )
  const volume = useMemo(() => data.series.map((p) => ({ hour: p.hour, value: p.volume })), [data])
  const rank = useMemo(() => data.frames.map((f) => ({ hour: f.hour, value: f.rank })), [data])

  return (
    <ReplayPlayer clock={clock} raceStart={data.raceStart} live={data.live} color={data.color}>

      <div className="divide-y divide-border">
        <div className="p-4 md:p-5">
          <Eyebrow>Equity · ${data.startingCapitalQuote.toLocaleString("en-US")} + P&amp;L</Eyebrow>
          <AgentSeriesChart
            points={equity}
            kind="equity"
            color={data.color}
            checkpointHours={data.checkpointHours}
            startingCapitalQuote={data.startingCapitalQuote}
            playheadHour={hour}
            height={240}
          />
        </div>
        <div className="p-4 md:p-5">
          <Eyebrow>Cumulative Volume</Eyebrow>
          <AgentSeriesChart
            points={volume}
            kind="volume"
            color={data.color}
            checkpointHours={data.checkpointHours}
            startingCapitalQuote={data.startingCapitalQuote}
            playheadHour={hour}
            height={180}
          />
        </div>
        {rank.length > 1 && (
          <div className="p-4 md:p-5">
            <Eyebrow>Position in the Field</Eyebrow>
            <AgentSeriesChart
              points={rank}
              kind="rank"
              color={data.color}
              checkpointHours={data.checkpointHours}
              startingCapitalQuote={data.startingCapitalQuote}
              fieldSize={data.fieldSize}
              playheadHour={hour}
              height={180}
            />
          </div>
        )}
      </div>
    </ReplayPlayer>
  )
}
