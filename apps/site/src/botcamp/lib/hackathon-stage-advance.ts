import { prisma } from "@/botcamp/lib/prisma"
import { FINALS_SESSION_SELECT, findRaceWindow } from "@/botcamp/lib/hackathon-stages"

// One instance re-checks at most this often; every render calling in between is free.
const MIN_INTERVAL_MS = 10_000
let lastRunAt = 0

/**
 * Moves hackathons along when their race clock says so, so a stage change
 * never waits on an admin being online at the exact minute:
 *   - COUNTDOWN → ACTIVE  once the race has started
 *   - COUNTDOWN / ACTIVE → JUDGING once the race has ended
 *
 * The clock is findRaceWindow: raceStart/raceEnd when set, else the finals
 * session's date. This is the one place "the race is over" is computed from
 * dates — access to entries' code reads only the stage it leaves behind
 * (RACE_OVER_STATUSES). An admin can still pick any stage; to keep a race
 * Live past its end, move raceEnd instead.
 *
 * Called lazily from the pages and APIs that render stage-dependent UI, and
 * from the race check on entries' code — the project's crons are daily, too
 * coarse for a race start. Idempotent.
 */
export async function advanceDueHackathonStages(now: Date = new Date()): Promise<void> {
  if (now.getTime() - lastRunAt < MIN_INTERVAL_MS) return
  lastRunAt = now.getTime()
  try {
    const live = await prisma.hackathon.findMany({
      where: { status: { in: ["COUNTDOWN", "ACTIVE"] } },
      select: { id: true, status: true, ...FINALS_SESSION_SELECT },
    })
    for (const hackathon of live) {
      const race = findRaceWindow(hackathon)
      if (!race) continue
      // Ending first: a Countdown whose whole race window has passed skips straight to Judging.
      const next = race.end <= now ? "JUDGING" : hackathon.status === "COUNTDOWN" && race.start <= now ? "ACTIVE" : null
      if (!next) continue
      // Guarded on the stage read, so an admin's change in between wins
      await prisma.hackathon.updateMany({
        where: { id: hackathon.id, status: hackathon.status },
        data: { status: next },
      })
    }
  } catch (error) {
    // Never break a page render over this; the next call retries.
    lastRunAt = 0
    console.error("Failed to advance hackathon stages:", error)
  }
}
