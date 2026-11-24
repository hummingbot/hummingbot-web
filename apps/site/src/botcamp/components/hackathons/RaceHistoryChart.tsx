"use client"

import { useEffect, useId, useRef, useState } from "react"
import { pointIndexAt } from "./AgentSeriesChart"
import type { Checkpoint } from "@/botcamp/lib/hackathon-leaderboard"
import type { ReplayFrame } from "@/botcamp/lib/hackathon-leaderboard-data"

interface ChartAgent {
  agentId: string
  title: string
  color: string
  // 0 = the team's first seat (solid line), 1 = second seat (dashed). Two
  // agents share a team color, so the dash is their secondary encoding.
  seat: number
}

interface RaceHistoryChartProps {
  // Checkpoints reached so far (grid first, maybe a trailing "Now").
  checkpoints: Checkpoint[]
  agents: ChartAgent[]
  // Every planned checkpoint hour, reached or not — the x axis always spans
  // the whole race, with upcoming checkpoints drawn faded.
  plannedHours: number[]
  // Replaying the race: lines follow every half-hour frame and are drawn up
  // to `hour`, the labels hold the order at that hour, and the field's
  // volume fills in below.
  replay?: { frames: Record<string, ReplayFrame[]>; hour: number; endHour: number }
  // The race is over: the winners stand out. `celebrate` counts the replay's
  // arrivals at the finish (0 = none yet); each one plays the finish once.
  finish?: { winners: string[]; celebrate: number }
}

const ROW_H = 30
// On a short screen the rows close up, down to this, so the chart fits its slide.
const MIN_ROW_H = 16
// The sticky header above every slide.
const HEADER_PX = 64
const PAD_TOP = 36
const PAD_BOTTOM = 12
const PAD_LEFT = 44
const PAD_RIGHT = 250
const WIDTH = 960
// The field's cumulative volume, under the running order.
const VOLUME_H = 72
const VOLUME_GAP = 28
// Replayed lines step every 2 hours: every half hour, near-ties swap back and
// forth and the chart turns to noise.
const LINE_STEP_HOURS = 2

const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

/** The whole field's cumulative volume at each frame hour. */
export function fieldVolume(frames: Record<string, ReplayFrame[]>): { hour: number; value: number }[] {
  const byHour = new Map<number, number>()
  for (const path of Object.values(frames)) {
    for (const f of path) byHour.set(f.hour, (byHour.get(f.hour) ?? 0) + f.volumeQuote)
  }
  return [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([hour, value]) => ({ hour, value }))
}

/** Volume at `hour`, straight-line between frames so it ticks up smoothly. */
export function volumeAt(points: { hour: number; value: number }[], hour: number): number {
  const i = Math.max(0, pointIndexAt(points, hour))
  const a = points[i]
  const b = points[i + 1]
  if (!b || hour <= a.hour) return a.value
  return a.value + ((b.value - a.value) * (hour - a.hour)) / (b.hour - a.hour)
}

/**
 * The row height that lets the chart's full-screen slide (`data-panel`) fit
 * the window: the slide's overflow comes out of the rows, between MIN_ROW_H
 * and ROW_H. Outside a slide, rows keep ROW_H.
 */
function useFitRowHeight(svgRef: React.RefObject<SVGSVGElement | null>, rows: number, extraUnits: number): number {
  const [rowH, setRowH] = useState(ROW_H)
  useEffect(() => {
    const svg = svgRef.current
    const panel = svg?.closest<HTMLElement>("[data-panel]")
    const content = panel?.firstElementChild
    if (!svg || !panel || !content) return
    const fit = () => {
      const style = getComputedStyle(panel)
      const room = window.innerHeight - HEADER_PX - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const box = svg.getBoundingClientRect()
      const unitsPerPx = WIDTH / box.width
      // The chart's height if the slide's other content kept its size.
      const targetUnits = (box.height + room - content.getBoundingClientRect().height) * unitsPerPx
      const fitted = (targetUnits - PAD_TOP - PAD_BOTTOM - extraUnits) / rows
      // Whole units, so re-fitting after its own resize settles instead of jittering.
      setRowH(Math.max(MIN_ROW_H, Math.min(ROW_H, Math.floor(fitted))))
    }
    // The slide's content changes height too, e.g. when the finish banner appears.
    const observer = new ResizeObserver(fit)
    observer.observe(content)
    window.addEventListener("resize", fit)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", fit)
    }
  }, [svgRef, rows, extraUnits])
  return rowH
}

/**
 * Position chart (an F1 "lap chart"): one line per agent through the race
 * checkpoints, y = running order. Rank is what the score is built from, so
 * position over time is the story; raw P&L lines for 14 agents would be
 * unreadable and would hide the volume-driven agents entirely.
 *
 * x is proportional to time, so mid-race the lines stop at a "Now" marker
 * partway along and the checkpoints still ahead show as faded columns.
 *
 * Hovering or focusing an agent (line or label) highlights it, fades the rest
 * and prints its position at every checkpoint.
 */
export function RaceHistoryChart({ checkpoints, agents, plannedHours, replay, finish }: RaceHistoryChartProps) {
  const [active, setActive] = useState<string | null>(null)
  const clipId = useId()
  const n = agents.length
  const svgRef = useRef<SVGSVGElement>(null)
  const rowH = useFitRowHeight(svgRef, n, replay ? VOLUME_GAP + VOLUME_H : 0)
  const plotBottom = PAD_TOP + n * rowH
  const volumeTop = plotBottom + VOLUME_GAP
  const height = (replay ? volumeTop + VOLUME_H : plotBottom) + PAD_BOTTOM
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const maxHour = plannedHours[plannedHours.length - 1] ?? 1
  const x = (hour: number) => PAD_LEFT + (hour / maxHour) * plotW
  const y = (position: number) => PAD_TOP + (position - 0.5) * rowH
  const last = checkpoints[checkpoints.length - 1]
  const reachedHour = last.hour
  const labelX = x(maxHour) + 12
  const columns = [0, ...plannedHours].map((hour, i, all) => ({
    hour,
    label: i === 0 ? "Grid" : i === all.length - 1 ? "Final" : `${hour}h`,
    upcoming: hour > reachedHour,
  }))

  // Replaying and not yet at the end: the playhead is where the lines stop.
  const playing = replay !== undefined && replay.hour < replay.endHour
  const hour = playing ? replay.hour : reachedHour

  // An agent's frames every LINE_STEP_HOURS, keeping the latest.
  const framesFor = (agentId: string) => {
    const frames = replay?.frames[agentId] ?? []
    return frames.filter(
      (f, i) => i === frames.length - 1 || Number.isInteger(f.hour / LINE_STEP_HOURS),
    )
  }

  // Each agent's (hour, position) path: its frames while replaying, ending
  // on the latest checkpoint so the line meets its label.
  const pointsFor = (agentId: string) => {
    const cps = checkpoints.map((cp) => ({ hour: cp.hour, position: cp.positions[agentId] }))
    const frames = framesFor(agentId)
    if (!frames.length) return cps
    const tail = frames[frames.length - 1].hour < last.hour ? [cps[cps.length - 1]] : []
    return [...frames.map((f) => ({ hour: f.hour, position: f.position })), ...tail]
  }

  // Where an agent stands at the playhead, and its position there.
  const standing = (agentId: string) => {
    if (!playing) return { position: last.positions[agentId], rank: last.ranks[agentId], y: y(last.positions[agentId]) }
    const frames = framesFor(agentId)
    const i = Math.max(0, pointIndexAt(frames, hour))
    const a = frames[i]
    const b = frames[i + 1]
    const t = b ? (hour - a.hour) / (b.hour - a.hour) : 0
    // The lines ease between frames, so the head does too.
    const eased = t * t * (3 - 2 * t)
    return { position: a.position, rank: a.rank, y: y(a.position + (b ? (b.position - a.position) * eased : 0)) }
  }

  // Smooth S-curves between points, the usual bump-chart shape.
  const pathFor = (agentId: string) =>
    pointsFor(agentId)
      .map((p, k, all) => {
        const px = x(p.hour)
        const py = y(p.position)
        if (k === 0) return `M ${px} ${py}`
        const prevX = x(all[k - 1].hour)
        const prevY = y(all[k - 1].position)
        const mid = (prevX + px) / 2
        return `C ${mid} ${prevY}, ${mid} ${py}, ${px} ${py}`
      })
      .join(" ")

  // At the finish, with nobody hovered, the winners take the focus.
  const winners = new Set(finish && active === null ? finish.winners : [])
  const isDim = (agentId: string) =>
    active !== null ? active !== agentId : winners.size > 0 && !winners.has(agentId)

  const ordered = [...agents].sort((a, b) => last.positions[a.agentId] - last.positions[b.agentId])

  // The whole field's cumulative volume, filling in up to the playhead.
  const volume = (() => {
    if (!replay) return null
    const points = fieldVolume(replay.frames)
    if (points.length === 0) return null
    const max = Math.max(...points.map((p) => p.value), 1)
    const vy = (v: number) => volumeTop + VOLUME_H - (v / max) * VOLUME_H
    const line = points.map((p, k) => `${k === 0 ? "M" : "L"} ${x(p.hour)} ${vy(p.value)}`).join(" ")
    const area = `${line} L ${x(points[points.length - 1].hour)} ${volumeTop + VOLUME_H} L ${x(0)} ${volumeTop + VOLUME_H} Z`
    const now = volumeAt(points, hour)
    return { line, area, now, nowY: vy(now) }
  })()

  return (
    <div className="relative overflow-x-auto">
      {/* A flash across the field as the leader takes the flag */}
      {finish && finish.celebrate > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div key={finish.celebrate} className="race-finish-sweep absolute inset-0" />
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full min-w-[640px] h-auto select-none"
        role="img"
        aria-label="Running order of every agent at each race checkpoint"
        onMouseLeave={() => setActive(null)}
      >
        {replay && (
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={x(hour) + 6} height={height} />
            </clipPath>
          </defs>
        )}

        {/* Checkpoint columns — upcoming ones faded and dashed */}
        {columns.map((col) => (
          <g key={col.hour} style={{ opacity: col.upcoming ? 0.4 : 1 }}>
            <line
              x1={x(col.hour)}
              x2={x(col.hour)}
              y1={PAD_TOP - 8}
              y2={plotBottom}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray={col.upcoming ? "3 5" : undefined}
            />
            <text
              x={x(col.hour)}
              y={PAD_TOP - 16}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
            >
              {col.label}
            </text>
          </g>
        ))}

        {/* Live "Now" marker between checkpoints, or the replay's playhead */}
        {(playing || last.isNow) && (
          <g>
            <line
              x1={x(hour)}
              x2={x(hour)}
              y1={PAD_TOP - 8}
              y2={replay ? volumeTop + VOLUME_H : plotBottom}
              className="stroke-primary"
              strokeWidth={1.5}
            />
            {!playing && (
              <>
                <rect x={x(hour) - 22} y={PAD_TOP - 29} width={44} height={17} rx={8.5} className="fill-primary" />
                <text
                  x={x(hour)}
                  y={PAD_TOP - 17}
                  textAnchor="middle"
                  className="fill-primary-foreground font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                >
                  Now
                </text>
              </>
            )}
          </g>
        )}

        {/* The chequered flag at the finish line */}
        {finish && finish.celebrate > 0 && (
          <g key={finish.celebrate} className="race-finish-flag">
            <defs>
              <pattern id={`${clipId}-flag`} width={8} height={8} patternUnits="userSpaceOnUse">
                <rect width={8} height={8} className="fill-background" />
                <rect width={4} height={4} className="fill-foreground" />
                <rect x={4} y={4} width={4} height={4} className="fill-foreground" />
              </pattern>
            </defs>
            <rect
              x={x(maxHour) - 4}
              y={PAD_TOP - 8}
              width={8}
              height={plotBottom - PAD_TOP + 8}
              fill={`url(#${clipId}-flag)`}
              opacity={0.7}
            />
          </g>
        )}

        {/* Position axis */}
        {Array.from({ length: n }, (_, i) => (
          <text
            key={i}
            x={PAD_LEFT - 18}
            y={y(i + 1) + 4}
            textAnchor="end"
            className="fill-muted-foreground font-mono text-[11px] tabular-nums"
          >
            {i + 1}
          </text>
        ))}

        {/* Lines: faded ones first so the active line always draws on top */}
        {[...agents]
          .sort((a, b) => Number(a.agentId === active) - Number(b.agentId === active))
          .map((agent) => {
            const dim = isDim(agent.agentId)
            const won = winners.has(agent.agentId)
            const d = pathFor(agent.agentId)
            const head = standing(agent.agentId)
            const passed = checkpoints.filter((cp) => cp.hour <= hour)
            return (
              <g
                key={agent.agentId}
                onMouseEnter={() => setActive(agent.agentId)}
                style={{ opacity: dim ? (active !== null ? 0.12 : 0.3) : 1, transition: "opacity 400ms" }}
              >
                <g clipPath={replay ? `url(#${clipId})` : undefined}>
                  {/* Wide invisible stroke: a hit target bigger than the mark */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                  <path
                    d={d}
                    fill="none"
                    stroke={agent.color}
                    strokeWidth={active === agent.agentId || won ? 3.5 : 2}
                    style={won ? { filter: `drop-shadow(0 0 6px ${agent.color})` } : undefined}
                    strokeDasharray={agent.seat === 1 ? "6 5" : undefined}
                    strokeLinecap="round"
                  />
                </g>
                {/* Dotted leader from the line's tip to its label column */}
                {hour < maxHour && (
                  <line
                    x1={x(hour)}
                    x2={labelX}
                    y1={head.y}
                    y2={y(head.position)}
                    stroke={agent.color}
                    strokeWidth={1}
                    strokeDasharray="1 5"
                    opacity={0.5}
                  />
                )}
                {passed.map((cp) => (
                  <circle
                    key={cp.hour}
                    cx={x(cp.hour)}
                    cy={y(cp.positions[agent.agentId])}
                    r={4.5}
                    fill={agent.color}
                    className="stroke-card"
                    strokeWidth={2}
                  />
                ))}
                {playing && (
                  <circle cx={x(hour)} cy={head.y} r={5} fill={agent.color} className="stroke-card" strokeWidth={2} />
                )}
                {won && finish && finish.celebrate > 0 && (
                  <circle
                    key={finish.celebrate}
                    cx={x(last.hour)}
                    cy={y(last.positions[agent.agentId])}
                    r={6}
                    fill="none"
                    stroke={agent.color}
                    strokeWidth={2}
                    className="race-finish-ring"
                  />
                )}
                {active === agent.agentId &&
                  passed.map((cp) => (
                    <text
                      key={cp.hour}
                      x={x(cp.hour)}
                      y={y(cp.positions[agent.agentId]) - 10}
                      textAnchor="middle"
                      className="fill-foreground font-mono text-[11px] font-bold"
                    >
                      {cp.ranks[agent.agentId]}
                    </text>
                  ))}
              </g>
            )
          })}

        {/* Direct labels in the running order at the playhead — text in ink,
            the swatch carries identity. They slide as places change. */}
        {ordered.map((agent) => {
          const { position, rank } = standing(agent.agentId)
          const dim = isDim(agent.agentId)
          const won = winners.has(agent.agentId)
          return (
            <g
              key={agent.agentId}
              tabIndex={0}
              onMouseEnter={() => setActive(agent.agentId)}
              onFocus={() => setActive(agent.agentId)}
              onBlur={() => setActive(null)}
              className="cursor-default outline-hidden motion-safe:transition-transform motion-safe:duration-300"
              style={{ opacity: dim ? 0.35 : 1, transform: `translateY(${y(position)}px)` }}
            >
              <rect x={labelX} y={-rowH / 2} width={PAD_RIGHT - 16} height={rowH} fill="transparent" />
              <line
                x1={labelX + 4}
                x2={labelX + 20}
                y1={0}
                y2={0}
                stroke={agent.color}
                strokeWidth={3}
                strokeDasharray={agent.seat === 1 ? "4 3" : undefined}
              />
              <text
                x={labelX + 28}
                y={4}
                className={won ? "fill-amber-600 dark:fill-amber-300 text-[12px] font-semibold" : "fill-foreground text-[12px]"}
              >
                <tspan className="font-mono font-bold">{won ? "🏆 " : ""}{rank}</tspan>
                <tspan dx={8}>{agent.title.length > 26 ? `${agent.title.slice(0, 25)}…` : agent.title}</tspan>
              </text>
            </g>
          )
        })}

        {/* The field's volume, filling in as the race runs */}
        {volume && (
          <g>
            <text
              x={PAD_LEFT}
              y={volumeTop - 10}
              className="fill-muted-foreground font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
            >
              Field volume
            </text>
            <line x1={x(0)} x2={x(maxHour)} y1={volumeTop + VOLUME_H} y2={volumeTop + VOLUME_H} className="stroke-border" />
            <g clipPath={`url(#${clipId})`}>
              <path d={volume.area} className="fill-primary/15" />
              <path d={volume.line} fill="none" className="stroke-primary" strokeWidth={2} />
            </g>
            <text
              x={labelX + 4}
              y={volume.nowY + 5}
              className="fill-foreground font-mono text-[15px] font-bold tabular-nums"
            >
              {usdWhole.format(volume.now)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
