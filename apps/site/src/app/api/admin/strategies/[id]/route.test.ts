/**
 * Deleting a strategy from the admin (the Condor Ready "Delete Agent" action).
 * The risks: a non-admin deleting, and a hackathon's records blocking the
 * delete with a bare 500 instead of saying why.
 */

import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyDelete = vi.fn()
const raceDataBlocksDelete = vi.fn()
const auth = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: { strategy: { delete: (...args: unknown[]) => strategyDelete(...args) } },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/race-data-guard", () => ({
  raceDataBlocksDelete: (...args: unknown[]) => raceDataBlocksDelete(...args),
}))
vi.mock("@/botcamp/lib/notifications", () => ({ sendStrategyStatusEmail: vi.fn() }))

const { DELETE } = await import("./route")

const del = (id = "42") =>
  DELETE(new NextRequest(`http://localhost/api/admin/strategies/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  })

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } })
  raceDataBlocksDelete.mockResolvedValue(null)
  strategyDelete.mockResolvedValue({ id: 42 })
})

describe("DELETE /api/admin/strategies/[id]", () => {
  it("is admin-only", async () => {
    auth.mockResolvedValue({ user: { id: "u", role: "STUDENT" } })
    expect((await del()).status).toBe(401)
    expect(strategyDelete).not.toHaveBeenCalled()
  })

  it("deletes the strategy", async () => {
    expect((await del()).status).toBe(200)
    expect(strategyDelete).toHaveBeenCalledWith({ where: { id: 42 } })
  })

  it("refuses when race data is recorded for it", async () => {
    raceDataBlocksDelete.mockResolvedValue("This strategy has race data recorded")
    expect((await del()).status).toBe(409)
    expect(strategyDelete).not.toHaveBeenCalled()
  })

  it("says why when a hackathon's records point at it, instead of a 500", async () => {
    strategyDelete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", { code: "P2003", clientVersion: "6" }),
    )
    const res = await del()
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/hackathon's records.*make it private instead/)
  })
})
