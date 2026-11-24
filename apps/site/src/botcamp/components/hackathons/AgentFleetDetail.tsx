import { Eyebrow, SectionTitle } from "@/botcamp/components/hackathons/AgentSectionTitle"
import { GAIN_COLOR, LOSS_COLOR } from "@/botcamp/lib/design-constants"
import type { FleetDetail, FleetExecutorKind, FleetLpPosition } from "@/botcamp/lib/hackathon-fleet-detail"

const VENUES: Record<string, string> = {
  binance: "Binance",
  gate_io: "Gate",
  gate_io_perpetual: "Gate Perp",
  bitget: "Bitget",
  bitget_perpetual: "Bitget Perp",
  hyperliquid_perpetual: "Hyperliquid Perp",
  "solana-mainnet-beta": "Solana",
  jupiter: "Jupiter",
  orca: "Orca",
  meteora: "Meteora",
}

const EXECUTOR_TYPES: Record<FleetExecutorKind, { name: string; description: string }> = {
  position_executor: { name: "Position", description: "Opens a position with take-profit, stop-loss and time limits" },
  order_executor: { name: "Order", description: "Places a single order on an exchange" },
  swap: { name: "Swap", description: "Swaps tokens on Solana through Jupiter" },
  lp_executor: { name: "Liquidity Position", description: "Provides liquidity in a price range on Orca or Meteora" },
}

const TABLE_CARD = "rounded-bc-xl border border-border bg-card/80 backdrop-blur-xs overflow-x-auto"
const TABLE_HEAD = "border-b border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
const TABLE_BODY = "divide-y divide-border/60 font-mono tabular-nums"

const venueName = (venue: string): string => VENUES[venue] ?? venue
const usd = (n: number, decimals = 0): string =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
// A figure that rounds to $0.00 reads as zero, not as a loss of nothing.
const signedUsd = (n: number): string =>
  `${n > -0.005 ? "+" : "−"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pnlColor = (n: number): string | undefined => (Math.abs(n) < 0.005 ? undefined : n > 0 ? GAIN_COLOR : LOSS_COLOR)
const held = (minutes: number): string =>
  minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${(minutes / 60).toFixed(1)}h` : `${(minutes / 1440).toFixed(1)}d`
const price = (n: number): string => (n >= 100 ? n.toFixed(1) : n >= 1 ? n.toFixed(2) : n.toPrecision(3))
const utc = (iso: string): string =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })

function Dash(): React.ReactElement {
  return <span className="text-muted-foreground">{"—"}</span>
}

function ShareBar({ share, color }: { share: number; color: string }): React.ReactElement {
  return (
    <span className="inline-block w-16 h-1.5 rounded-full bg-border/70 mr-3 align-middle overflow-hidden">
      <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: color }} />
    </span>
  )
}

// A liquidity position's price range with where it entered and where price
// ended up, on one scale.
function RangeBar({ position, color }: { position: FleetLpPosition; color: string }): React.ReactElement {
  const { lower, upper, entry, last, inRange } = position
  const low = Math.min(lower, entry, last)
  const high = Math.max(upper, entry, last)
  const pad = (high - low) * 0.1 || 1
  const width = 150
  const x = (v: number) => ((v - (low - pad)) / (high - low + 2 * pad)) * width
  return (
    <svg width={width} height={16} viewBox={`0 0 ${width} 16`} role="img" aria-label={`Range ${price(lower)} to ${price(upper)}, entry ${price(entry)}, last ${price(last)}`}>
      <title>{`Range ${price(lower)} to ${price(upper)} · entry ${price(entry)} · last ${price(last)}`}</title>
      <rect x={0} y={7} width={width} height={2} rx={1} className="fill-border" />
      <rect x={x(lower)} y={3} width={Math.max(2, x(upper) - x(lower))} height={10} rx={2} fill={color} fillOpacity={0.28} stroke={color} />
      <line x1={x(entry)} x2={x(entry)} y1={1} y2={15} className="stroke-foreground" strokeWidth={1.5} />
      <circle cx={x(last)} cy={8} r={3.5} fill={inRange ? GAIN_COLOR : LOSS_COLOR} className="stroke-background" strokeWidth={1.5} />
    </svg>
  )
}

export function AgentTraded({
  detail,
  leaderboardPnl,
  color,
}: {
  detail: FleetDetail
  leaderboardPnl: number
  color: string
}): React.ReactElement {
  const maxVolume = Math.max(...detail.pairs.map((p) => p.volume), 1)
  const gap = leaderboardPnl - detail.fleetPnl
  return (
    <section className="sd-reveal">
      <SectionTitle title="Pairs and Venues" />
      <div className={TABLE_CARD}>
        <table className="w-full text-sm">
          <thead>
            <tr className={TABLE_HEAD}>
              <th className="text-left font-bold px-5 py-3">Pair</th>
              <th className="text-left font-bold px-5 py-3">Venue</th>
              <th className="text-right font-bold px-5 py-3">Volume</th>
              <th className="text-right font-bold px-5 py-3">Fees</th>
              <th className="text-right font-bold px-5 py-3">Realized</th>
              <th className="text-right font-bold px-5 py-3">Unrealized</th>
            </tr>
          </thead>
          <tbody className={TABLE_BODY}>
            {detail.pairs.map((p) => (
              <tr key={`${p.source}|${p.venue}|${p.pair}`}>
                <td className="px-5 py-3 font-sans font-semibold">{p.pair}</td>
                <td className="px-5 py-3 font-sans">{venueName(p.venue)}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <ShareBar share={p.volume / maxVolume} color={color} />
                  {usd(p.volume)}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">{p.fees ? usd(p.fees, 2) : <Dash />}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap" style={{ color: p.realized === null ? undefined : pnlColor(p.realized) }}>
                  {p.realized === null ? <Dash /> : signedUsd(p.realized)}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap" style={{ color: p.unrealized === null ? undefined : pnlColor(p.unrealized) }}>
                  {p.unrealized === null ? <Dash /> : signedUsd(p.unrealized)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Math.abs(gap) >= 1 && (
        <p className="text-muted-foreground text-xs mt-3">
          The fleet backup puts this agent&apos;s P&amp;L at {signedUsd(detail.fleetPnl)}. The leaderboard scores the live race
          feed, so the two can differ, and the figures on this page come from the backup.
        </p>
      )}
    </section>
  )
}

export function AgentExecuted({ detail, color }: { detail: FleetDetail; color: string }): React.ReactElement {
  const { executors, lp, controllers } = detail
  const maxCount = Math.max(...executors.types.map((t) => t.count), 1)
  const lpFees = lp.reduce((sum, p) => sum + p.fees, 0)
  const lpInRange = lp.filter((p) => p.inRange).length
  // Win rate by controller: every agent has some, while many executors (order
  // executors, swaps) record no P&L of their own to win or lose on.
  const profitable = controllers.filter((c) => c.pnl > 0).length
  return (
    <section className="sd-reveal">
      <SectionTitle title="Executors and Positions" />

      <div className="rounded-bc-xl border border-border bg-card/60 backdrop-blur-xs grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden mb-4">
        <div className="p-5">
          <Eyebrow>Executors</Eyebrow>
          <div className="text-2xl font-bold tabular-nums font-mono">{executors.total.toLocaleString("en-US")}</div>
          <div className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
            {[
              executors.controller > 0 && `${executors.controller.toLocaleString("en-US")} controller`,
              executors.api > 0 && `${executors.api.toLocaleString("en-US")} API`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className="p-5">
          <Eyebrow>Win Rate</Eyebrow>
          <div className="text-2xl font-bold tabular-nums font-mono">
            {controllers.length > 0 ? `${profitable} of ${controllers.length}` : <Dash />}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
            {controllers.length === 1 ? "Controller in profit" : "Controllers in profit"}
          </div>
        </div>
        <div className="p-5">
          <Eyebrow>Fees Paid</Eyebrow>
          <div className="text-2xl font-bold tabular-nums font-mono">{executors.fees > 0 ? usd(executors.fees, 2) : "$0"}</div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {executors.fees > 0 ? "Across all pairs" : "Zero-fee pairs"}
          </div>
        </div>
      </div>

      <div className={TABLE_CARD}>
        <table className="w-full text-sm">
          <thead>
            <tr className={TABLE_HEAD}>
              <th className="text-left font-bold px-5 py-3">Executor Type</th>
              <th className="text-right font-bold px-5 py-3">Count</th>
              <th className="text-right font-bold px-5 py-3">Failed</th>
              <th className="text-right font-bold px-5 py-3">Win Rate</th>
              <th className="text-right font-bold px-5 py-3">Net P&amp;L</th>
              <th className="text-right font-bold px-5 py-3">Volume</th>
              <th className="text-right font-bold px-5 py-3">Fees</th>
            </tr>
          </thead>
          <tbody className={TABLE_BODY}>
            {executors.types.map((t) => {
              const { name, description } = EXECUTOR_TYPES[t.type]
              return (
                <tr key={t.type}>
                  <td className="px-5 py-3 font-sans">
                    <div className="font-semibold">{name}</div>
                    <div className="text-xs text-muted-foreground max-w-[34ch] whitespace-normal">{description}</div>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <ShareBar share={t.count / maxCount} color={color} />
                    {t.count.toLocaleString("en-US")}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">{t.failed ? t.failed.toLocaleString("en-US") : <Dash />}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {t.scored > 0 ? `${Math.round((t.wins / t.scored) * 100)}%` : <Dash />}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap" style={{ color: t.pnl === null ? undefined : pnlColor(t.pnl) }}>
                    {t.pnl === null ? <Dash /> : signedUsd(t.pnl)}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">{t.volume ? usd(t.volume) : <Dash />}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">{t.fees ? usd(t.fees, 2) : <Dash />}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {controllers.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 mb-2 px-1">
            <h3 className="text-sm font-semibold">Controllers</h3>
            <p className="text-xs text-muted-foreground">
              {controllers.length} {controllers.length === 1 ? "controller" : "controllers"}
            </p>
          </div>
          <div className={TABLE_CARD}>
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="text-left font-bold px-3 py-3">Controller</th>
                  <th className="text-left font-bold px-3 py-3">Type</th>
                  <th className="text-right font-bold px-3 py-3">Executors</th>
                  <th className="text-right font-bold px-3 py-3">Failed</th>
                  <th className="text-right font-bold px-3 py-3">Win Rate</th>
                  <th className="text-right font-bold px-3 py-3">P&amp;L</th>
                  <th className="text-right font-bold px-3 py-3">Volume</th>
                  <th className="text-right font-bold px-3 py-3">Fees</th>
                </tr>
              </thead>
              <tbody className={TABLE_BODY}>
                {controllers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-3 min-w-[11rem] max-w-[26rem]">
                      <div className="font-semibold break-words">
                        {c.id}
                        {c.source === "api" && (
                          <span className="ml-2 align-middle font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground border border-border rounded-bc-sm px-1 py-0.5">
                            API
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-sans">
                        {[c.pairs.join(", "), c.source === "bot" && c.runs > 1 ? `${c.runs} runs` : null].filter(Boolean).join(" · ")}
                      </div>
                      {c.firstAt && c.lastAt && (
                        <div className="text-xs text-muted-foreground font-sans">
                          {utc(c.firstAt)} → {utc(c.lastAt)} UTC
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-sans whitespace-nowrap">
                      {c.types.length > 0 ? c.types.map((t) => EXECUTOR_TYPES[t].name).join(" + ") : <Dash />}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">{c.executors ? c.executors.toLocaleString("en-US") : <Dash />}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">{c.failed ? c.failed.toLocaleString("en-US") : <Dash />}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {c.scored > 0 ? `${Math.round((c.wins / c.scored) * 100)}%` : <Dash />}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap" style={{ color: pnlColor(c.pnl) }}>
                      {signedUsd(c.pnl)}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">{c.volume ? usd(c.volume) : <Dash />}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">{c.fees ? usd(c.fees, 2) : <Dash />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lp.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 mb-2 px-1">
            <h3 className="text-sm font-semibold">Liquidity Positions</h3>
            <p className="text-xs text-muted-foreground">
              {lp.length} {lp.length === 1 ? "position" : "positions"} · {lpInRange} in range when closed ·{" "}
              {lpFees >= 0.005 ? `${usd(lpFees, 2)} fees collected` : "no fees collected"}
            </p>
          </div>
          <div className={TABLE_CARD}>
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="text-left font-bold px-5 py-3">Pool</th>
                  <th className="text-left font-bold px-5 py-3">Opened (UTC)</th>
                  <th className="text-right font-bold px-5 py-3">Held</th>
                  <th className="text-left font-bold px-5 py-3">Range · Entry · Last</th>
                  <th className="text-left font-bold px-5 py-3">Closed</th>
                  <th className="text-right font-bold px-5 py-3">Fees</th>
                </tr>
              </thead>
              <tbody className={TABLE_BODY}>
                {lp.map((p) => (
                  <tr key={`${p.pair}|${p.opened}`}>
                    <td className="px-5 py-3 font-sans whitespace-nowrap">
                      <span className="font-semibold">{p.pair}</span>{" "}
                      <span className="text-muted-foreground">{venueName(p.venue)}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{utc(p.opened)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">{held(p.minutes)}</td>
                    <td className="px-5 py-3">
                      <RangeBar position={p} color={color} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] rounded-bc-sm border px-1.5 py-1"
                        style={{ color: p.inRange ? GAIN_COLOR : LOSS_COLOR, borderColor: p.inRange ? GAIN_COLOR : LOSS_COLOR }}
                      >
                        {p.inRange ? "In range" : "Out of range"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">{p.fees >= 0.005 ? usd(p.fees, 2) : <Dash />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
