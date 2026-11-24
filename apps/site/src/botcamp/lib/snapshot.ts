import { z } from "zod"

/**
 * Client for the HBOT Snapshot vote on a hackathon.
 *
 * HBOT holders vote on https://snapshot.org/#/hbot.eth, spreading their voting
 * power across the teams. The proposal must use Snapshot's weighted voting
 * type: each ballot splits the voter's HBOT across the choices, and the
 * proposal's `scores` are the HBOT each choice received, which orders every
 * team. Ranked-choice (IRV) can't be used — its scores only cover the final
 * runoff round, so every eliminated team would read 0.
 *
 * Each proposal choice is a team name; matchTeamsToChoices pairs them up.
 */

export const SNAPSHOT_SPACE = "hbot.eth"
export const SNAPSHOT_HUB_URL = "https://hub.snapshot.org/graphql"
export const SNAPSHOT_VOTING_TYPE = "weighted"
// Snapshot's hub recomputes scores as votes land; no point asking more often.
export const SNAPSHOT_CACHE_SECONDS = 60

const REQUEST_TIMEOUT_MS = 5_000
const PROPOSAL_ID_PATTERN = /^0x[0-9a-f]{64}$/i

export function isSnapshotProposalId(id: string): boolean {
  return PROPOSAL_ID_PATTERN.test(id)
}

export function snapshotProposalUrl(proposalId: string): string {
  return `https://snapshot.org/#/${SNAPSHOT_SPACE}/proposal/${proposalId}`
}

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SnapshotError"
  }
}

const proposalSchema = z.object({
  id: z.string(),
  type: z.string(),
  state: z.enum(["pending", "active", "closed"]),
  start: z.number(),
  end: z.number(),
  choices: z.array(z.string()),
  scores: z.array(z.number()),
  scores_total: z.number(),
  votes: z.number(),
  space: z.object({ id: z.string() }),
})

const responseSchema = z.object({
  data: z.object({ proposal: proposalSchema.nullable() }).nullable().optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

export interface SnapshotProposal {
  id: string
  type: string
  state: "pending" | "active" | "closed"
  start: Date
  end: Date
  choices: string[]
  // One per choice, in `choices` order: the HBOT voting power each choice
  // received, summing to the total voting power.
  scores: number[]
  // Total HBOT voted.
  scoresTotal: number
  votes: number
  space: string
}

const PROPOSAL_QUERY = `query Proposal($id: String!) {
  proposal(id: $id) { id type state start end choices scores scores_total votes space { id } }
}`

export async function fetchSnapshotProposal(proposalId: string): Promise<SnapshotProposal> {
  if (!isSnapshotProposalId(proposalId)) {
    throw new SnapshotError(`"${proposalId}" is not a Snapshot proposal ID (expected 0x followed by 64 hex characters)`)
  }

  let response: Response
  try {
    response = await fetch(SNAPSHOT_HUB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: PROPOSAL_QUERY, variables: { id: proposalId } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Cached one level up with unstable_cache; the hackathon pages are dynamic.
      cache: "no-store",
    })
  } catch (err) {
    throw new SnapshotError(`Snapshot request failed: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (!response.ok) {
    throw new SnapshotError(`Snapshot responded ${response.status}`)
  }

  const parsed = responseSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new SnapshotError("Snapshot response did not match the expected shape")
  }
  if (parsed.data.errors?.length) {
    throw new SnapshotError(`Snapshot error: ${parsed.data.errors.map((e) => e.message).join("; ")}`)
  }
  const proposal = parsed.data.data?.proposal
  if (!proposal) {
    throw new SnapshotError(`Snapshot proposal ${proposalId} not found`)
  }

  return {
    id: proposal.id,
    type: proposal.type,
    state: proposal.state,
    start: new Date(proposal.start * 1000),
    end: new Date(proposal.end * 1000),
    choices: proposal.choices,
    scores: proposal.scores,
    scoresTotal: proposal.scores_total,
    votes: proposal.votes,
    space: proposal.space.id,
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

// A choice names a team when it is the team name, or starts with it followed
// by a non-alphanumeric character — so "Gate agents: 7,8" is Gate, but
// "Gateway" is not.
function choiceNamesTeam(choice: string, teamName: string): boolean {
  const c = normalizeName(choice)
  const t = normalizeName(teamName)
  return c === t || (c.startsWith(t) && !/[a-z0-9]/.test(c[t.length]))
}

/**
 * Pairs each proposal choice with a team by name (see choiceNamesTeam) and
 * returns the team-id → score map. Throws a SnapshotError naming the mismatch
 * unless the proposal is a weighted vote in hbot.eth whose choices pair
 * one-to-one with the hackathon's teams — a missing or misspelled team would
 * otherwise silently score last.
 */
export function matchTeamsToChoices(
  proposal: SnapshotProposal,
  teams: Array<{ id: string; name: string }>,
): Record<string, number> {
  if (proposal.space !== SNAPSHOT_SPACE) {
    throw new SnapshotError(`Proposal is in the ${proposal.space} space, not ${SNAPSHOT_SPACE}`)
  }
  if (proposal.type !== SNAPSHOT_VOTING_TYPE) {
    throw new SnapshotError(
      `Proposal uses "${proposal.type}" voting; it must use weighted voting so every team gets a score`,
    )
  }

  const problems: string[] = []
  const choiceOf = new Map<string, number>()
  for (const team of teams) {
    const matches = proposal.choices.flatMap((choice, i) => (choiceNamesTeam(choice, team.name) ? [i] : []))
    if (matches.length === 1) choiceOf.set(team.id, matches[0])
    else if (matches.length === 0) problems.push(`no choice for team ${team.name}`)
    else problems.push(`several choices for team ${team.name}: ${matches.map((i) => proposal.choices[i]).join(", ")}`)
  }
  const claimed = new Set(choiceOf.values())
  const extra = proposal.choices.filter((_, i) => !claimed.has(i))
  if (problems.length === 0 && extra.length > 0) problems.push(`choices with no team: ${extra.join(", ")}`)
  if (problems.length > 0) {
    throw new SnapshotError(`Proposal choices must name the teams — ${problems.join("; ")}`)
  }

  return Object.fromEntries(teams.map((t) => [t.id, proposal.scores[choiceOf.get(t.id)!] ?? 0]))
}
