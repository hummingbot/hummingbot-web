import { describe, it, expect, vi, beforeEach } from "vitest"

const raceMetricCount = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: { raceMetric: { count: (...args: unknown[]) => raceMetricCount(...args) } },
}))

const { raceDataBlocksDelete } = await import("./race-data-guard")

beforeEach(() => raceMetricCount.mockReset())

describe("raceDataBlocksDelete", () => {
  it("allows the delete when there's no race data behind it", async () => {
    raceMetricCount.mockResolvedValue(0)
    expect(await raceDataBlocksDelete({ applicationId: "app1" }, "application")).toBeNull()
    expect(raceMetricCount).toHaveBeenCalledWith({ where: { applicationId: "app1" } })
  })

  it("explains why when race data blocks it", async () => {
    raceMetricCount.mockResolvedValue(3)
    expect(await raceDataBlocksDelete({ application: { selectedTeamId: "t1" } }, "team")).toMatch(
      /team has race data recorded.*leaderboard/,
    )
  })
})
