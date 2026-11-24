/**
 * What an Agent Builders Cup agent traded and how it executed, from the fleet
 * backup of the five hummingbot-api hosts. scripts/import-fleet-detail.ts
 * builds a FleetDetail per agent and stores it in RaceAgentDetail.data; the
 * agent page reads it back.
 *
 * The backup's figures are not the leaderboard's: the leaderboard scores the
 * live race feed. `fleetPnl` and `fleetVolume` are the backup's own totals so
 * the page can say when the two disagree.
 */

export type FleetExecutorKind = "position_executor" | "order_executor" | "lp_executor" | "swap"

// Position and liquidity executors record their own P&L. An order executor
// places one order, and a swap is one trade: whatever they make or lose is
// booked on the held position or the controller, never on them.
const RECORDS_PNL: Record<FleetExecutorKind, boolean> = {
  position_executor: true,
  lp_executor: true,
  order_executor: false,
  swap: false,
}
export const recordsPnl = (kind: FleetExecutorKind): boolean => RECORDS_PNL[kind]

// Hummingbot's CloseType enum, as a bot's own database stores it.
const CLOSE_TYPE_NAMES: Record<number, string> = {
  1: "TIME_LIMIT",
  2: "STOP_LOSS",
  3: "TAKE_PROFIT",
  4: "EXPIRED",
  5: "EARLY_STOP",
  6: "TRAILING_STOP",
  7: "INSUFFICIENT_BALANCE",
  8: "FAILED",
  9: "COMPLETED",
  10: "POSITION_HOLD",
}

export function closeTypeName(code: number): string {
  const name = CLOSE_TYPE_NAMES[code]
  if (!name) throw new Error(`Unknown executor close type: ${code}`)
  return name
}

/**
 * An executor that errored, or could not place its order for lack of balance,
 * never traded. At-The-Touch alone retried 388,682 times on an empty account.
 */
export const isFailedClose = (name: string): boolean => name === "FAILED" || name === "INSUFFICIENT_BALANCE"

export interface FleetPair {
  venue: string
  pair: string
  // Controllers report realized and unrealized P&L per pair; API executors
  // report one net P&L, and swaps report none.
  source: "controller" | "executors"
  volume: number
  fees: number
  realized: number | null
  unrealized: number | null
}

export interface FleetExecutorType {
  type: FleetExecutorKind
  count: number
  failed: number
  // Executors of a type that records its own P&L and that traded, and how
  // many of those made money. Zero for the types that record none.
  scored: number
  wins: number
  // Null for a type that records no P&L of its own.
  pnl: number | null
  volume: number
  fees: number
}

export interface FleetLpPosition {
  venue: string
  pair: string
  lower: number
  upper: number
  entry: number
  last: number
  opened: string
  closed: string | null
  minutes: number
  inRange: boolean
  fees: number
}

// One controller, across every run it appeared in: a restart keeps the
// controller id but starts a new bot run.
export interface FleetController {
  id: string
  // "bot": a controller inside a trading bot. Its P&L and volume are the
  // controller's own report, which includes positions it held; its executors
  // come from the bot's database. "api": executors created through
  // hummingbot-api, grouped by the controller id they carry.
  source: "bot" | "api"
  runs: number
  pnl: number
  volume: number
  fees: number
  executors: number
  failed: number
  scored: number
  wins: number
  types: FleetExecutorKind[]
  // Executors by how they closed, e.g. { EARLY_STOP: 4603 }.
  closeTypes: Record<string, number>
  pairs: string[]
  firstAt: string | null
  lastAt: string | null
}

export interface FleetDetail {
  source: string
  fleetPnl: number
  fleetVolume: number
  pairs: FleetPair[]
  controllers: FleetController[]
  executors: {
    total: number
    // Executors the trading bots ran, against those created through the API
    // (swaps included).
    controller: number
    api: number
    // Executors that record their own P&L and traded, and how many of those
    // made money.
    scored: number
    wins: number
    fees: number
    types: FleetExecutorType[]
  }
  lp: FleetLpPosition[]
}

// Solana mints the backup's liquidity positions refer to, by address.
const KNOWN_MINTS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL: "MET",
  pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn: "PUMP",
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE: "ORCA",
  RBLXDGRD64AtRamHMFVcjqne3Ar7NLWtFtYNtsrf1cE: "RBLX",
  DELL2aRKQz7DMq5DrKLtkn47ZCnbxXPZXrSGbkmd13wy: "DELL",
}

// A mint with no known ticker takes the ticker of the controller pair whose
// breakeven price is within this share of the position's entry price.
const MINT_MATCH_TOLERANCE = 0.03

/** Quote-currency volume of a swap: a sell returns quote, a buy spends it. */
export function swapQuoteVolume(side: string, inputAmount: number, outputAmount: number): number {
  if (side === "SELL") return outputAmount
  if (side === "BUY") return inputAmount
  throw new Error(`Unknown swap side: ${side}`)
}

/** Tickers for the mints in `positions`, matched to controller pairs by price. */
export function matchMintTickers(
  positions: Array<{ base: string; entry: number }>,
  breakevens: Array<{ ticker: string; price: number }>,
): Map<string, string> {
  const matched = new Map<string, string>()
  for (const { base, entry } of positions) {
    if (KNOWN_MINTS[base] || matched.has(base) || breakevens.length === 0) continue
    const nearest = breakevens.reduce((best, b) => (Math.abs(b.price - entry) < Math.abs(best.price - entry) ? b : best))
    if (Math.abs(nearest.price - entry) / entry < MINT_MATCH_TOLERANCE) matched.set(base, nearest.ticker)
  }
  return matched
}

/** "SPCXx-USDC" for a pool named by mint addresses; unmatched mints stay as short addresses. */
export function lpPairLabel(tradingPair: string, matched: Map<string, string>): string {
  const [base, quote] = tradingPair.split("-")
  const name = (mint: string) => KNOWN_MINTS[mint] ?? matched.get(mint) ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`
  return `${name(base)}-${name(quote)}`
}

/** One row per pair and venue, controller rows and executor rows together, biggest volume first. */
export function mergeTradedPairs(
  controller: Array<Omit<FleetPair, "source">>,
  executors: Array<{ venue: string; pair: string; volume: number; fees: number; pnl: number | null }>,
): FleetPair[] {
  const rows: FleetPair[] = controller.map((p) => ({ ...p, source: "controller" }))
  const byKey = new Map<string, FleetPair>()
  for (const e of executors) {
    const key = `${e.venue}|${e.pair}`
    const row = byKey.get(key) ?? { venue: e.venue, pair: e.pair, source: "executors", volume: 0, fees: 0, realized: null, unrealized: null }
    row.volume += e.volume
    row.fees += e.fees
    if (e.pnl !== null) row.realized = (row.realized ?? 0) + e.pnl
    byKey.set(key, row)
  }
  return [...rows, ...byKey.values()].sort((a, b) => b.volume - a.volume || a.pair.localeCompare(b.pair))
}
