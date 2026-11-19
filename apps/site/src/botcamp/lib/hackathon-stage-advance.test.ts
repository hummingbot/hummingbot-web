/**
 * Automatic stage moves when a race clock runs out. The risks: a race whose
 * window comes from the finals session (no raceEnd) never ending, so its
 * entries' code stayed hidden until an admin moved the stage; overriding a
 * stage an admin just picked; or hammering the DB on every render.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const findMany = vi.fn()
const updateMany = vi.fn().mockResolvedValue({ count: 1 })

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    hackathon: {
      findMany: (...args: unknown[]) => findMany(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
  },
}))

const { advanceDueHackathonStages } = await import("./hackathon-stage-advance")

const hours = (n: number) => n * 3_600_000

describe("advanceDueHackathonStages", () => {
  let clock = new Date("2027-03-01T12:00:00Z").getTime()
  const tick = () => new Date((clock += hours(1)))

  beforeEach(() => {
    findMany.mockReset()
    updateMany.mockClear()
  })

  it("ends a race past its raceEnd, guarded on the stage it read", async () => {
    const now = tick()
    findMany.mockResolvedValue([
      { id: "h1", status: "ACTIVE", raceStart: new Date(now.getTime() - hours(30)), raceEnd: new Date(now.getTime() - 1), sessions: [] },
    ])
    await advanceDueHackathonStages(now)
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "h1", status: "ACTIVE" }, data: { status: "JUDGING" } })
  })

  it("ends a race whose window comes from the finals session", async () => {
    const now = tick()
    findMany.mockResolvedValue([
      { id: "h2", status: "ACTIVE", raceStart: null, raceEnd: null, sessions: [{ slug: "finals", date: new Date(now.getTime() - hours(24 * 30)) }] },
    ])
    await advanceDueHackathonStages(now)
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "h2", status: "ACTIVE" }, data: { status: "JUDGING" } })
  })

  it("starts a due countdown, and leaves a race still running alone", async () => {
    const now = tick()
    findMany.mockResolvedValue([
      { id: "h3", status: "COUNTDOWN", raceStart: new Date(now.getTime() - 1), raceEnd: new Date(now.getTime() + hours(24)), sessions: [] },
      { id: "h4", status: "ACTIVE", raceStart: new Date(now.getTime() - 1), raceEnd: new Date(now.getTime() + hours(24)), sessions: [] },
    ])
    await advanceDueHackathonStages(now)
    expect(updateMany).toHaveBeenCalledTimes(1)
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "h3", status: "COUNTDOWN" }, data: { status: "ACTIVE" } })
  })

  it("leaves a hackathon with no race window alone", async () => {
    findMany.mockResolvedValue([{ id: "h5", status: "ACTIVE", raceStart: null, raceEnd: null, sessions: [] }])
    await advanceDueHackathonStages(tick())
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("skips the DB when called again within the throttle window", async () => {
    findMany.mockResolvedValue([])
    const now = tick()
    await advanceDueHackathonStages(now)
    findMany.mockClear()
    await advanceDueHackathonStages(new Date(now.getTime() + 5_000))
    expect(findMany).not.toHaveBeenCalled()
    await advanceDueHackathonStages(new Date(now.getTime() + 11_000))
    expect(findMany).toHaveBeenCalledTimes(1)
  })
})
