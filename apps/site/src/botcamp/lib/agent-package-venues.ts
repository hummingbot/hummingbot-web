import yaml from "js-yaml"
import type { AgentPackageFile } from "@/botcamp/lib/agent-package"

// Where an agent trades, read from its package, so the New Agent flow can
// fill in the page's exchanges instead of leaving its cards without venues.
// The connectors are Hummingbot's (`connector_name` in any YAML config, or in
// a loop's default_config) — including configs Condor leaves out, like a race
// entry's conf/, since this only suggests the page's venues and installs
// nothing. The page's exchanges are the site's
// own vocabulary (src/lib/strategy-tags.ts), so each connector is reduced to
// its venue here and matched against that vocabulary by the caller.

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

// Connector names whose venue isn't simply the name minus its market suffix.
const VENUE_ALIASES: Record<string, string> = {
  gate_io: "gate",
}

/** A connector's venue: `gate_io_perpetual` → `gate`, `meteora/clmm` → `meteora`. */
export function venueOfConnector(connector: string): string {
  const name = connector.trim().toLowerCase().split("/")[0]
  let base = name
  // Suffixes can stack: hyperliquid_perpetual_testnet.
  while (/_(perpetual|paper_trade|testnet)$/.test(base)) base = base.replace(/_(perpetual|paper_trade|testnet)$/, "")
  return VENUE_ALIASES[base] ?? base
}

// A config that uses YAML anchors or aliases (`&name`, `*name`). Hummingbot
// configs don't, and an alias makes one value reachable from many places: a
// few hundred bytes of nested aliases parse cheaply but expand to billions of
// values when walked. Venues only pre-fill a form field, so such a config is
// skipped rather than walked.
const YAML_ANCHOR_OR_ALIAS = /(^|[\s[{,:-])[&*][^\s,[\]{}]+/m

// The most values one package's configs are walked through, in total. Real
// configs are a few dozen values each.
const MAX_VALUES_VISITED = 10_000

// Every connector named in a parsed config: `connector_name`, plus any
// `connectors` list, wherever they sit in it. Each object is visited once and
// the walk stops when the budget runs out, so its cost is bounded however the
// config is shaped.
function collectConnectors(
  value: unknown,
  into: Set<string>,
  budget: { left: number },
  seen: WeakSet<object>,
  depth = 0,
): void {
  if (depth > 6 || budget.left <= 0 || typeof value !== "object" || value === null || seen.has(value)) return
  seen.add(value)
  budget.left--
  if (Array.isArray(value)) {
    for (const item of value) collectConnectors(item, into, budget, seen, depth + 1)
    return
  }
  for (const [key, item] of Object.entries(value)) {
    if (budget.left-- <= 0) return
    if (key === "connector_name" && typeof item === "string" && item.trim()) into.add(item)
    else if (key === "connectors" && Array.isArray(item)) {
      item.forEach((c) => typeof c === "string" && c.trim() && into.add(c))
    } else collectConnectors(item, into, budget, seen, depth + 1)
  }
}

/** The venues an agent's package trades on, in first-seen order. */
export function venuesInPackage(files: Pick<AgentPackageFile, "path" | "content">[]): string[] {
  const connectors = new Set<string>()
  const budget = { left: MAX_VALUES_VISITED }
  const seen = new WeakSet<object>()
  for (const file of files) {
    const text = file.content.toString("utf8")
    try {
      if (/\.ya?ml$/i.test(file.path)) {
        if (!YAML_ANCHOR_OR_ALIAS.test(text)) collectConnectors(yaml.load(text), connectors, budget, seen)
      } else if (/(^|\/)loops\/[^/]+\/loop\.md$/.test(file.path)) {
        const match = FRONTMATTER.exec(text)
        if (match && !YAML_ANCHOR_OR_ALIAS.test(match[1])) {
          collectConnectors(yaml.load(match[1]), connectors, budget, seen)
        }
      }
    } catch {
      // The package check reports invalid YAML; here it just has no venues.
    }
  }
  return [...new Set([...connectors].map(venueOfConnector))]
}
