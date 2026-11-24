import type { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"

/**
 * Race data (RaceMetric readings) blocks deleting the application, team or
 * strategy behind a racing agent. For an application the database refuses
 * anyway, which used to surface as a generic 500; for a team or strategy the
 * delete would silently drop the agent — and its standings — from the
 * leaderboard. Delete routes call this first and answer with a 409 carrying
 * the returned message instead. Null when nothing blocks the delete.
 */
export async function raceDataBlocksDelete(
  where: Prisma.RaceMetricWhereInput,
  thing: "application" | "team" | "strategy",
): Promise<string | null> {
  const count = await prisma.raceMetric.count({ where })
  if (count === 0) return null
  return `This ${thing} has race data recorded for the finals, so deleting it would remove an agent from the leaderboard.`
}
