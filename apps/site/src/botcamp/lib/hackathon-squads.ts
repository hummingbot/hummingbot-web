import { SPONSOR_EXCHANGES } from "@/botcamp/lib/exchanges"

// Seed-only default for a new Hackathon's `maxSelections` column, which is
// the single source of truth at runtime for how many Agent Driver slots each
// squad fields. Never read this outside hackathon-creation flows — every
// display/enforcement surface must read `Hackathon.maxSelections` instead.
export const DEFAULT_SLOTS_PER_SQUAD = 2

// Max number of distinct agents (applications) a builder may submit per hackathon.
export const MAX_APPLICATIONS_PER_HACKATHON = 2

// Max number of sponsor teams a builder may rank per application (Top 1 + Top 2 choice).
export const MAX_TEAM_PREFERENCES = 2

// The host squad. Slug must match the host Team record in the DB (dev/prod use "botcamp").
export const BOTCAMP_SLUG = "botcamp"

// Fallback brand color when a Team has no primaryColor set in DB.
export const DEFAULT_PRIMARY_COLOR = "#FF6A1A"

// Exchanges/venues agents may trade on during the competition.
export const ELIGIBLE_EXCHANGES = SPONSOR_EXCHANGES.map((e) => e.label)

// Hummingbot connector guides for each eligible exchange/venue, surfaced on
// the Resources page — how to configure the connector inside Hummingbot,
// not the raw exchange API docs.
export const EXCHANGE_API_LINKS: Record<string, { docsUrl: string; note: string }> =
  Object.fromEntries(
    SPONSOR_EXCHANGES.map((e) => [e.label, { docsUrl: e.docsUrl, note: e.note }])
  )

export type ScoringCriterionKey = "volume" | "pnl" | "vote"

// Driver scoring. An agent's score is the sum over the criteria of its rank
// points × `multiplier` (2 × P&L + 2 × Volume + 1 × Vote); `weight` is each
// criterion's resulting share of the score (must sum to 100). `key` is what
// the leaderboard scorer (src/lib/hackathon-leaderboard.ts) reads, so the
// published rules and the computed standings can't drift apart.
export const SCORING_CRITERIA: Array<{
  key: ScoringCriterionKey
  label: string
  weight: number
  multiplier: number
}> = [
  { key: "volume", label: "Volume", weight: 40, multiplier: 2 },
  { key: "pnl", label: "P&L", weight: 40, multiplier: 2 },
  { key: "vote", label: "HBOT Vote in Snapshot Proposal", weight: 20, multiplier: 1 },
]

// Per-agent stake. Single source for every surface that quotes it, so the
// figure can't drift between the hackathon page and the team pages.
// The number is what P&L % is computed against on the leaderboard.
export const STARTING_CAPITAL_QUOTE = 800
const STARTING_CAPITAL_AMOUNT = `$${STARTING_CAPITAL_QUOTE}`

// Core competition rules surfaced on the landing + squad pages.
export const SQUAD_RULES = {
  startingCapitalAmount: STARTING_CAPITAL_AMOUNT,
  startingCapital: `${STARTING_CAPITAL_AMOUNT} starting capital per agent`,
  botLimit: "Hummingbot Controller or Condor Agent",
}

// Sponsor squads are every squad except the host (Botcamp). Kept exported in
// case copy needs to distinguish sponsor count from total.
export function sponsorSquadCount(teamSlugs: string[]): number {
  return teamSlugs.filter((slug) => slug !== BOTCAMP_SLUG).length
}

// Every team (host + sponsors) fields `slotsPerSquad` agents that all race
// for individual ranking — e.g. 5 teams × 2 = 10 ranked agents.
export function totalRankedDrivers(teamSlugs: string[], slotsPerSquad: number): number {
  return teamSlugs.length * slotsPerSquad
}

const SMALL_NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
]

// Seat counts appear in prose ("Each team fields two agents"), and that copy
// used to hardcode the word while the grid beside it read `maxSelections` —
// so changing the column desynced the sentence from the seats it described.
// Spells small whole numbers and falls back to the numeral for anything the
// list does not cover, including non-integers.
export function spellCount(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < SMALL_NUMBER_WORDS.length
    ? SMALL_NUMBER_WORDS[n]
    : String(n)
}

// "two agents" / "1 agent" — the seat-count phrase used across hackathon copy.
export function agentCountPhrase(n: number): string {
  return `${spellCount(n)} ${n === 1 ? "agent" : "agents"}`
}

// Bounds for `Hackathon.maxSelections`. A squad needs at least one seat, and
// the ceiling keeps a typo from allocating a huge seat array during SSR —
// several server-rendered pages build seats with `while (n < maxSelections)`.
export const MIN_SLOTS_PER_SQUAD = 1
export const MAX_SLOTS_PER_SQUAD = 10

// Validates a proposed `maxSelections` before it reaches the database.
//
// Pure, like `validateTeamPreferences`, so the create and edit routes share
// one rule. This column stopped being cosmetic once it replaced the old
// SLOTS_PER_SQUAD constant: it now drives seat-render loops and the selection
// cap, so `0` would silently close every apply CTA and render "0 / 0 Slots
// Filled", and an oversized value would allocate that many seats per team on
// every request.
//
// Returns an error message, or null when the value is valid.
export function validateMaxSelections(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return "maxSelections must be an integer"
  }
  if (value < MIN_SLOTS_PER_SQUAD || value > MAX_SLOTS_PER_SQUAD) {
    return `maxSelections must be between ${MIN_SLOTS_PER_SQUAD} and ${MAX_SLOTS_PER_SQUAD}`
  }
  return null
}

// Validates a ranked team-preference list for a hackathon application.
//
// Deliberately pure — no DB access — so the same rule is shared by the create
// route, the edit route (owner *and* admin branches) and, if needed, the
// client form. Callers resolve `botcampTeamId` and the application's current
// `existingPreferences` first.
//
// Returns an error message, or null when the list is valid.
export function validateTeamPreferences({
  teamPreferences,
  hackathonTeamIds,
  botcampTeamId,
  existingPreferences = [],
}: {
  teamPreferences: string[]
  hackathonTeamIds: string[]
  botcampTeamId: string | null
  existingPreferences?: string[]
}): string | null {
  if (teamPreferences.length > MAX_TEAM_PREFERENCES) {
    return `You can rank at most ${MAX_TEAM_PREFERENCES} teams`
  }

  if (new Set(teamPreferences).size !== teamPreferences.length) {
    return "You cannot rank the same team more than once"
  }

  for (const teamId of teamPreferences) {
    if (!hackathonTeamIds.includes(teamId)) {
      return `Invalid team ID: ${teamId}`
    }
  }

  // Botcamp is the host squad, not a sponsor to apply to. Block newly adding it, but don't
  // retroactively break a legacy application that already ranked it before
  // this restriction existed: those keep it until they drop it themselves.
  if (
    botcampTeamId &&
    teamPreferences.includes(botcampTeamId) &&
    !existingPreferences.includes(botcampTeamId)
  ) {
    return "You cannot apply to the Botcamp team"
  }

  return null
}
