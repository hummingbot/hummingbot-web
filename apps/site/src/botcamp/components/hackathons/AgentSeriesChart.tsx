"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"

interface AgentSeriesChartProps {
  // Hours since the race start → value (cumulative, or a position).
  points: { hour: number; value: number }[]
  // equity: starting capital + P&L, around a starting-capital baseline.
  // volume: cumulative volume from zero.
  // rank: position in the field, 1 at the top, as steps.
  kind: "equity" | "volume" | "rank"
  color: string
  // Checkpoint hours to mark, e.g. [12, 24, 36, 48]. The last one is "Final".
  checkpointHours: number[]
  startingCapitalQuote: number
  // For the rank axis.
  fieldSize?: number
  // The replay's clock: the line is drawn up to here, with a marker on it.
  playheadHour: number
  height?: number
}

// Drawn at the width it's shown at, so the labels stay legible on a phone.
// The server renders at DEFAULT_WIDTH until the browser measures.
const DEFAULT_WIDTH = 800
const PAD = { top: 16, right: 16, bottom: 30, left: 64 }

const usd = (v: number, signed: boolean) => {
  const abs = Math.abs(v)
  const body =
    abs >= 1_000_000
      ? `$${Number((abs / 1_000_000).toFixed(1))}M`
      : abs >= 1000
      ? `$${Number((abs / 1000).toFixed(abs >= 100_000 ? 0 : 1))}K`
      : `$${abs.toFixed(abs >= 100 || Number.isInteger(abs) ? 0 : 2)}`
  const sign = v < 0 ? "-" : signed && v > 0 ? "+" : ""
  return `${sign}${body}`
}

// Round tick step (1, 2 or 5 × 10^k) giving about `intervals` intervals.
function niceStep(range: number, intervals = 4): number {
  const raw = range / intervals
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
}

// Index of the last point at or before `hour`, or -1 before the first.
export function pointIndexAt(points: { hour: number }[], hour: number): number {
  let lo = 0
  let hi = points.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].hour <= hour) {
      found = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return found
}

/**
 * One agent's equity, volume or position over the race: a single line (the
 * card title names it, so no legend), checkpoint columns, and a crosshair
 * tooltip on hover. The axes are fixed to the whole race, and the line is
 * revealed up to the replay's playhead, so the replay never rescales.
 */
export function AgentSeriesChart({
  points,
  kind,
  color,
  checkpointHours,
  startingCapitalQuote,
  fieldSize = 1,
  playheadHour,
  height = 220,
}: AgentSeriesChartProps) {
  const clipId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [W, setW] = useState(DEFAULT_WIDTH)
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(([entry]) => setW(Math.round(entry.contentRect.width) || DEFAULT_WIDTH))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])
  // Shorter on a narrow screen, where three charts stack.
  const H = Math.round(Math.min(height, Math.max(150, W * 0.55)))

  const maxHour = checkpointHours[checkpointHours.length - 1] ?? points[points.length - 1]?.hour ?? 1
  const x = (hour: number) => PAD.left + (Math.min(hour, maxHour) / maxHour) * (W - PAD.left - PAD.right)

  const geometry = useMemo(() => {
    if (points.length < 2) return null
    const values = points.map((p) => p.value)
    let min: number
    let max: number
    let ticks: number[]
    let step = 1
    if (kind === "rank") {
      min = 1
      max = Math.max(fieldSize, ...values)
      step = max <= 6 ? 1 : max <= 15 ? 3 : niceStep(max - 1)
      ticks = [1]
      for (let t = step; t < max; t += step) if (t > 1) ticks.push(t)
      ticks.push(max)
    } else {
      // Domain snapped to round ticks around the baseline (starting capital
      // for equity, zero for volume), which is always one of them.
      const base = kind === "equity" ? startingCapitalQuote : 0
      const lo = Math.min(base, ...values)
      const hi = Math.max(base, ...values)
      step = niceStep(hi - lo || 1)
      min = base - Math.ceil((base - lo) / step) * step
      max = base + Math.ceil((hi - base) / step) * step
      if (max === min) max = min + step
      ticks = []
      for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t / step) * step)
    }
    const y = (v: number) =>
      kind === "rank"
        ? PAD.top + ((v - min) / (max - min || 1)) * (H - PAD.top - PAD.bottom)
        : PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom)
    const line =
      kind === "rank"
        ? points
            .map((p, i) => (i === 0 ? `M ${x(p.hour)} ${y(p.value)}` : `H ${x(p.hour)} V ${y(p.value)}`))
            .join(" ")
        : points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.hour)} ${y(p.value)}`).join(" ")
    const baseY = kind === "equity" ? y(startingCapitalQuote) : y(min)
    const area =
      kind === "rank"
        ? null
        : `${line} L ${x(points[points.length - 1].hour)} ${baseY} L ${x(points[0].hour)} ${baseY} Z`
    return { ticks, y, line, area, baseY, step }
    // x depends only on maxHour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, kind, fieldSize, startingCapitalQuote, H, W, maxHour])

  if (!geometry) return null
  const { ticks, y, line, area, baseY, step } = geometry

  // Equity sits near the starting capital, so its ticks keep the cents a
  // small move needs; the tooltip always shows them.
  const dollars = (v: number, decimals: number) =>
    `$${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  const label = (v: number) =>
    kind === "rank" ? `#${v}` : kind === "equity" ? dollars(v, step < 1 ? 2 : 0) : usd(v, false)
  const tooltipValue = (v: number) => (kind === "equity" ? dollars(v, 2) : label(v))

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const target = Math.min(((svgX - PAD.left) / (W - PAD.left - PAD.right)) * maxHour, playheadHour)
    setHover(pointIndexAt(points, target))
  }

  const head = pointIndexAt(points, playheadHour)
  const headPoint = head >= 0 ? points[head] : null
  const hovered = hover !== null && hover >= 0 ? points[hover] : null
  const clipWidth = Math.max(0, x(playheadHour) - PAD.left)

  return (
    <div ref={boxRef} className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={
          kind === "equity"
            ? "Equity over the race"
            : kind === "volume"
              ? "Cumulative volume over the race"
              : "Position in the field over the race"
        }
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left - 4} y={0} width={clipWidth + 8} height={H} />
          </clipPath>
        </defs>

        {/* Recessive y grid + labels (ink, not series color) */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border/60" strokeWidth={1} />
            <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
              {label(t)}
            </text>
          </g>
        ))}

        {/* Checkpoint columns */}
        {[0, ...checkpointHours].map((h, i, all) => (
          <g key={h}>
            <line
              x1={x(h)}
              x2={x(h)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className={h <= playheadHour ? "stroke-muted-foreground/60" : "stroke-border"}
              strokeDasharray="3 4"
              strokeWidth={1}
            />
            <text
              x={x(h)}
              y={H - 10}
              textAnchor={i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"}
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${
                h <= playheadHour ? "fill-foreground" : "fill-muted-foreground"
              }`}
            >
              {i === 0 ? "Start" : i === all.length - 1 ? "Final" : `${h}h`}
            </text>
          </g>
        ))}

        {kind === "equity" && (
          <line x1={PAD.left} x2={W - PAD.right} y1={baseY} y2={baseY} className="stroke-muted-foreground" strokeWidth={1} />
        )}

        <g clipPath={`url(#${clipId})`}>
          {area && <path d={area} fill={color} opacity={0.1} />}
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </g>

        {/* The playhead, until the replay reaches the finish */}
        {playheadHour < maxHour && (
          <line
            x1={x(playheadHour)}
            x2={x(playheadHour)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        )}
        {headPoint && !hovered && (
          <circle cx={x(headPoint.hour)} cy={y(headPoint.value)} r={4.5} fill={color} className="stroke-card" strokeWidth={2} />
        )}

        {hovered && (
          <g>
            <line
              x1={x(hovered.hour)}
              x2={x(hovered.hour)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className="stroke-foreground/40"
              strokeWidth={1}
            />
            <circle cx={x(hovered.hour)} cy={y(hovered.value)} r={5} fill={color} className="stroke-card" strokeWidth={2} />
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 rounded-bc-md border border-border bg-popover px-2.5 py-1.5 shadow-md font-mono text-xs"
          style={{
            left: `${(x(hovered.hour) / W) * 100}%`,
            transform: `translateX(${x(hovered.hour) > W * 0.7 ? "-110%" : "10%"})`,
          }}
        >
          <div className="text-muted-foreground">Hour {hovered.hour.toFixed(1)}</div>
          <div className="font-bold text-foreground">
            {tooltipValue(hovered.value)}
            {kind === "equity" && (
              <span className="text-muted-foreground font-normal">
                {" "}
                ({usd(hovered.value - startingCapitalQuote, true)},{" "}
                {(((hovered.value - startingCapitalQuote) / startingCapitalQuote) * 100).toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
