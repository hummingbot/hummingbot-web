import { prisma } from "@/botcamp/lib/prisma"
import { getRaceWindow, FINALS_SESSION_SELECT } from "@/botcamp/lib/hackathon-stages"

// How a running hackathon overrides a strategy's normal edit rules (issue #87):
//   - "selected": the agent holds a seat in a squad — a team selected its
//     application. Its builder keeps
//     editing it, even if it was certified in a cohort, past CODE_FREEZE and
//     up to the finals code freeze (FinalsWindow.codeFreeze, from the
//     hackathon's "finals" session).
//   - "locked": submissions have closed and the agent holds no seat, or it
//     holds one and the finals code freeze has passed.
//   - "none": not a submitted hackathon entry (or submissions are still open),
//     so the usual certification rule applies.
// Everything returns to normal once the hackathon is COMPLETED.
export type HackathonEditState =
  | { kind: "none" }
  // codeFreeze: ISO time the seated agent locks, so the editor can show it.
  | { kind: "selected"; teamName: string; codeFreeze: string }
  | { kind: "locked"; reason: "finals_code_freeze"; teamName: string; codeFreeze: string }
  | { kind: "locked"; reason: "not_selected" }

export interface HackathonEntry {
  /** The seat the agent holds, if any: its team and when it locks for the finals. */
  seat: { team: string; codeFreeze: Date } | null
  registrationEnd: Date | null
}

export function resolveHackathonEditState(
  entries: HackathonEntry[],
  now: Date = new Date(),
): HackathonEditState {
  if (entries.length === 0) return { kind: "none" }

  const seat = entries.find((e) => e.seat)?.seat
  if (seat) {
    const codeFreeze = seat.codeFreeze.toISOString()
    return now < seat.codeFreeze
      ? { kind: "selected", teamName: seat.team, codeFreeze }
      : { kind: "locked", reason: "finals_code_freeze", teamName: seat.team, codeFreeze }
  }

  const submissionsClosed = entries.some((e) => e.registrationEnd && now > e.registrationEnd)
  return submissionsClosed ? { kind: "locked", reason: "not_selected" } : { kind: "none" }
}

/** Every running-hackathon entry for the given strategies, keyed by strategy id. */
export async function loadHackathonEntries(strategyIds: number[]): Promise<Map<number, HackathonEntry[]>> {
  const entries = new Map<number, HackathonEntry[]>()
  if (strategyIds.length === 0) return entries

  // Drafts were never submitted, so they don't make the strategy an entry.
  // A selected application counts whatever its status.
  const applications = await prisma.application.findMany({
    where: {
      strategyId: { in: strategyIds },
      hackathon: { status: { not: "COMPLETED" } },
      OR: [{ status: { in: ["FINALIZED", "REVIEWED"] } }, { selectedTeamId: { not: null } }],
    },
    select: {
      strategyId: true,
      selectedTeam: { select: { name: true } },
      hackathon: {
        select: {
          slug: true,
          registrationEnd: true,
          ...FINALS_SESSION_SELECT,
        },
      },
    },
  })

  for (const a of applications) {
    if (a.strategyId === null) continue
    const seat = a.selectedTeam
      ? {
          team: a.selectedTeam.name,
          codeFreeze: getRaceWindow(a.hackathon).codeFreeze,
        }
      : null
    const entry = { seat, registrationEnd: a.hackathon.registrationEnd }
    entries.set(a.strategyId, [...(entries.get(a.strategyId) ?? []), entry])
  }

  return entries
}

export async function getHackathonEditState(
  strategyId: number,
  now: Date = new Date(),
): Promise<HackathonEditState> {
  const entries = await loadHackathonEntries([strategyId])
  return resolveHackathonEditState(entries.get(strategyId) ?? [], now)
}

/** Team name for each strategy holding a squad seat in a running hackathon. */
export async function getSeatTeams(strategyIds: number[]): Promise<Map<number, string>> {
  const entries = await loadHackathonEntries(strategyIds)
  const seatTeams = new Map<number, string>()
  for (const [strategyId, list] of entries) {
    const seat = list.find((e) => e.seat)?.seat
    if (seat) seatTeams.set(strategyId, seat.team)
  }
  return seatTeams
}

export function canEditWithState(state: HackathonEditState, status: string): boolean {
  if (state.kind === "selected") return true
  if (state.kind === "locked") return false
  return status !== "CERTIFIED"
}

// Server-side gate for every author edit: content, images, and code files.
export async function canEditStrategyContent(
  strategyId: number,
  status: string,
  now: Date = new Date(),
): Promise<boolean> {
  return canEditWithState(await getHackathonEditState(strategyId, now), status)
}
