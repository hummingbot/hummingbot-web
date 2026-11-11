import type { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"

// Ported from Botcamp's origin/main (the /hub page follows main; see
// src/app/hub/page.tsx). Only the read-only parts the library listing needs
// are kept: Botcamp's file goes on with per-viewer checks (unlock grants,
// membership, code access) and functions that grant access, which write to
// the database. This site is signed out and read-only.
export { STRATEGY_UNLOCK_PRICE_CENTS, STRATEGY_UNLOCK_DURATION_DAYS } from "@/botcamp/lib/strategy-unlock"

// RACE_OVER_STATUSES from Botcamp main's hackathon-stages.ts.
const RACE_OVER_STATUSES: Prisma.HackathonWhereInput["status"] = { in: ["JUDGING", "COMPLETED"] }

// A hackathon whose race is over, by its stage alone (RACE_OVER_STATUSES):
// the stage advance owns the clock, raceEnd and the finals-session fallback
// both. Until then its entries are competitive secrets — rivals are members
// too, and an entry's code made public at submission could be read (and
// copied, or traded against) before or during the race. `status` is never
// null, so the negation below is safe in SQL.
export const raceOverWhere: Prisma.HackathonWhereInput = { status: RACE_OVER_STATUSES }
const racingWhere: Prisma.HackathonWhereInput = { NOT: { status: RACE_OVER_STATUSES } }

// What makes an application a hackathon entry, for every check that asks:
// submitted (FINALIZED/REVIEWED), or picked by a team for its squad whatever
// its status now — a builder can reopen a selected application to DRAFT, and
// it still races. The checks used to disagree on that, and a reopened entry
// fell out of "racing" while staying in the squad.
const HACKATHON_ENTRY: Prisma.ApplicationWhereInput = {
  OR: [{ status: { in: ["FINALIZED", "REVIEWED"] } }, { selectedTeamId: { not: null } }],
}

// "Example" strategies — seeded under the Cohort with number 0 (see the
// `cohort === 0 ? "Example" : ...` convention used across the strategy UI) —
// are always free to view in full, since they exist to demo the platform
// rather than to be gated. So are strategies an admin marked `isFree` in the
// strategy editor — hackathon entries get it after the race, per strategy,
// from scripts/feature-hackathon-strategies.ts — and every agent that raced
// (a team picked it for its squad), with no flag needed, once that race is over. Every other certified
// strategy needs an active unlock (or cohort membership) beyond its public
// description. PRIVATE stays author+admin only.
function freePreviewWhere(): Prisma.StrategyWhereInput {
  return {
    visibility: { not: "PRIVATE" },
    OR: [
      { status: "CERTIFIED", cohortRelation: { number: 0 } },
      { isFree: true },
      {
        strategyType: "AGENT",
        applications: { some: { selectedTeamId: { not: null }, hackathon: raceOverWhere } },
      },
    ],
  }
}

export async function getFreePreviewStrategyIds(): Promise<Set<number>> {
  const strategies = await prisma.strategy.findMany({ where: freePreviewWhere(), select: { id: true } })
  return new Set(strategies.map((s) => s.id))
}

/** Whether one strategy is in the free-preview set, without listing the set. */
export async function isFreePreviewStrategy(strategyId: number): Promise<boolean> {
  return (await prisma.strategy.count({ where: { id: strategyId, ...freePreviewWhere() } })) > 0
}

export const PUBLISHED_STRATEGY_WHERE: Prisma.StrategyWhereInput = {
  OR: [
    { status: "CERTIFIED" as const },
    { applications: { some: HACKATHON_ENTRY } },
    { agentVersions: { some: { status: "APPROVED" as const } } },
  ],
}

// Not entered in a hackathon whose race is still on — the listing form of
// isRacingInHackathon, for catalogues that offer code to clone.
export function notRacingWhere(): Prisma.StrategyWhereInput {
  return {
    applications: {
      none: { ...HACKATHON_ENTRY, hackathon: racingWhere },
    },
  }
}
