/**
 * Per-hackathon starter kit (Hackathon.starterKit), edited in the admin
 * hackathon editor and published on /hackathons/[slug]/resources.
 *
 * The kit is the set of values every agent must use, so racers stop inventing
 * their own: in the Agent Builders Cup 2026, agents shipped with five different
 * model providers, `server_name` set to `local` or left empty, ad-hoc bot names,
 * and capital anywhere from $9 to $1,060. All of that had to be fixed during
 * the race.
 *
 * Starting capital and the scoring formula are not editable here — they come
 * from STARTING_CAPITAL_QUOTE and SCORING_CRITERIA, the same values the
 * leaderboard scores against, so the kit can't contradict the standings.
 *
 * Hosts live in a separate column (Hackathon.raceHosts) and are only shown to
 * builders holding a finals seat. Keeping them out of this JSON means a public
 * page that selects `starterKit` can never carry them.
 */

import { SPONSOR_EXCHANGES } from "@/botcamp/lib/exchanges"

export interface StarterKitMarket {
  /** Display name of the venue, e.g. "Gate". */
  venue: string
  /** Hummingbot connector names agents may use, e.g. "gate_io_perpetual". */
  connectors: string[]
  /** Allowed trading pairs, e.g. "BTC-USDT". Empty = any pair on these connectors. */
  pairs: string[]
}

export interface StarterKit {
  /** The LLM provider agents run on, e.g. "OpenRouter". */
  llmProvider: string
  /** Values allowed in `agent_key`, e.g. "openrouter:deepseek/deepseek-v4.1-flash". */
  approvedModels: string[]
  markets: StarterKitMarket[]
  /** `bot_name` pattern, with {team} and {agent} filled per agent. */
  botNamePattern: string
  /**
   * `position_mode` on perps. It's a setting of the whole account on a
   * connector, so two agents sharing an account must agree — hence one value
   * for the race rather than one per agent.
   */
  positionMode: PositionMode
  /** `on_kill_switch` in each agent's shutdown.md: what a wind-down closes. */
  shutdownPolicy: ShutdownPolicy
  supportLabel: string
  supportUrl: string
  /** Anything else racers need, in markdown. */
  notes: string
}

// Condor's three wind-down policies (condor/agents/shutdown.py).
export const SHUTDOWN_POLICIES = ["flatten_all", "keep_spot_close_perp", "keep_all"] as const
export type ShutdownPolicy = (typeof SHUTDOWN_POLICIES)[number]

export const POSITION_MODES = ["HEDGE", "ONEWAY"] as const
export type PositionMode = (typeof POSITION_MODES)[number]

export interface RaceHost {
  /** The value racers put in `server_name`. */
  name: string
  address: string
  note: string
}

// Hummingbot connector names for each sponsor venue. The race configs used
// these (gate_io_perpetual, bitget_perpetual, binance, xrpl) — not the venue
// ids in exchanges.ts, which is why the kit lists connectors explicitly.
const DEFAULT_CONNECTORS: Record<string, string[]> = {
  binance: ["binance", "binance_perpetual"],
  gate: ["gate_io", "gate_io_perpetual"],
  hyperliquid: ["hyperliquid", "hyperliquid_perpetual"],
  derive: ["derive", "derive_perpetual"],
  XRPL: ["xrpl"],
  solana: ["jupiter/router", "meteora/clmm", "orca/clmm", "raydium/clmm"],
  bitget: ["bitget", "bitget_perpetual"],
}

export const DEFAULT_BOT_NAME_PATTERN = "{team}-{agent}"

/** The starting point for every edition: the sponsor venues, any pair. */
export const DEFAULT_STARTER_KIT: StarterKit = {
  llmProvider: "",
  approvedModels: [],
  markets: SPONSOR_EXCHANGES.map((e) => ({
    venue: e.label,
    connectors: DEFAULT_CONNECTORS[e.id] ?? [],
    pairs: [],
  })),
  botNamePattern: DEFAULT_BOT_NAME_PATTERN,
  // HEDGE is what Condor's market making controllers assume: in ONEWAY a fill
  // nets against an open position and the executors' barriers lose track.
  positionMode: "HEDGE",
  // Last edition, agents were left holding funded positions with nobody
  // watching them. A wind-down closes everything.
  shutdownPolicy: "flatten_all",
  supportLabel: "#hackathon on the Hummingbot Discord",
  supportUrl: "https://discord.gg/hummingbot",
  notes: "",
}

const MAX_TEXT = 2000
const MAX_LIST = 100

function text(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

/** Trims, drops blanks and duplicates. Pairs are upper-cased (BTC-USDT). */
function list(value: unknown, upper = false): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const raw of value) {
    const item = upper ? text(raw).toUpperCase() : text(raw)
    if (item && !out.includes(item)) out.push(item)
  }
  return out.slice(0, MAX_LIST)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** Validates a stored/submitted kit. Returns the kit, or an error message. */
export function parseStarterKit(value: unknown): { kit: StarterKit } | { error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Starter kit must be an object" }
  }
  const raw = value as Record<string, unknown>

  if (!Array.isArray(raw.markets)) return { error: "Starter kit markets must be a list" }
  const markets: StarterKitMarket[] = []
  for (const m of raw.markets) {
    const market = (m ?? {}) as Record<string, unknown>
    const venue = text(market.venue)
    const connectors = list(market.connectors)
    if (!venue) return { error: "Every market needs a venue name" }
    if (connectors.length === 0) return { error: `${venue} needs at least one connector` }
    markets.push({ venue, connectors, pairs: list(market.pairs, true) })
  }

  const supportUrl = text(raw.supportUrl, 500)
  if (supportUrl && !/^https?:\/\//.test(supportUrl)) {
    return { error: "Support link must start with http:// or https://" }
  }

  return {
    kit: {
      llmProvider: text(raw.llmProvider),
      approvedModels: list(raw.approvedModels),
      markets,
      botNamePattern: text(raw.botNamePattern) || DEFAULT_BOT_NAME_PATTERN,
      // Kits saved before these existed get the defaults.
      positionMode: oneOf(raw.positionMode, POSITION_MODES, DEFAULT_STARTER_KIT.positionMode),
      shutdownPolicy: oneOf(raw.shutdownPolicy, SHUTDOWN_POLICIES, DEFAULT_STARTER_KIT.shutdownPolicy),
      supportLabel: text(raw.supportLabel),
      supportUrl,
      notes: text(raw.notes, MAX_TEXT),
    },
  }
}

/** The kit a hackathon publishes: its own, or the default until edited. */
export function resolveStarterKit(value: unknown): { kit: StarterKit; isDefault: boolean } {
  const parsed = value ? parseStarterKit(value) : null
  return parsed && "kit" in parsed ? { kit: parsed.kit, isDefault: false } : { kit: DEFAULT_STARTER_KIT, isDefault: true }
}

/** Validates the host list. Returns the hosts, or an error message. */
export function parseRaceHosts(value: unknown): { hosts: RaceHost[] } | { error: string } {
  if (!Array.isArray(value)) return { error: "Hosts must be a list" }
  const hosts: RaceHost[] = []
  for (const h of value) {
    const host = (h ?? {}) as Record<string, unknown>
    const name = text(host.name)
    if (!name) return { error: "Every host needs a name" }
    // `local` and blank were the two values racers fell back to last edition.
    if (name.toLowerCase() === "local") return { error: "`local` can't be a race host name" }
    if (hosts.some((x) => x.name === name)) return { error: `Duplicate host name: ${name}` }
    hosts.push({ name, address: text(host.address, 500), note: text(host.note, 500) })
  }
  return { hosts }
}

/** Fills {team} and {agent} in the bot name pattern. */
export function renderBotName(pattern: string, values: { team: string; agent: string }): string {
  return pattern.replace(/\{team\}/g, values.team).replace(/\{agent\}/g, values.agent)
}

/**
 * The frontmatter racers paste into their package, with the kit's values
 * filled in. Placeholders in <angle brackets> are what the kit can't know.
 */
export function buildConfigSnippet(
  kit: StarterKit,
  {
    startingCapital,
    serverName = "<your assigned host>",
    team = "<team-slug>",
    agent = "<agent-slug>",
  }: { startingCapital: number; serverName?: string; team?: string; agent?: string },
): string {
  const agentKey = kit.approvedModels[0] ?? "<an approved model>"
  return [
    "# AGENT.md",
    `agent_key: ${agentKey}`,
    `server_name: ${serverName}`,
    "",
    "# loops/<loop>/loop.md",
    "default_config:",
    `  bot_name: ${renderBotName(kit.botNamePattern, { team, agent })}`,
    `  total_amount_quote: ${startingCapital}`,
    "",
    "# controllers/<name>/sample_configs/<style>.yml (perps)",
    `position_mode: ${kit.positionMode}`,
    "",
    "# shutdown.md (top of the agent folder)",
    `on_kill_switch: ${kit.shutdownPolicy}`,
  ].join("\n")
}
