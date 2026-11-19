/**
 * Author delete. The risk: deleting a strategy that's published or that a
 * hackathon application still points at. Drafts, submitted and
 * changes-requested strategies go; approved/certified or hackathon-linked
 * ones stay.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyFindUnique = vi.fn()
const applicationCount = vi.fn()
const raceAgentCount = vi.fn()
const agentVersionCount = vi.fn()
const transaction = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategyAuthor: {
      findUnique: vi.fn().mockResolvedValue({ userId: "u1", strategyId: 7 }),
      deleteMany: vi.fn(),
    },
    strategy: { findUnique: (...args: unknown[]) => strategyFindUnique(...args), delete: vi.fn() },
    strategyFile: { deleteMany: vi.fn() },
    application: { count: (...args: unknown[]) => applicationCount(...args) },
    raceAgent: { count: (...args: unknown[]) => raceAgentCount(...args) },
    agentVersion: { count: (...args: unknown[]) => agentVersionCount(...args) },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { id: "u1", role: "STUDENT" } }) }))
vi.mock("@/botcamp/lib/race-data-guard", () => ({ raceDataBlocksDelete: vi.fn().mockResolvedValue(null) }))
vi.mock("@/botcamp/lib/notifications", () => ({ sendStrategyStatusEmail: vi.fn() }))

const { DELETE } = await import("./route")

const remove = () =>
  DELETE(new NextRequest("http://localhost/api/user/strategies/7", { method: "DELETE" }), {
    params: Promise.resolve({ id: "7" }),
  })

beforeEach(() => {
  vi.clearAllMocks()
  applicationCount.mockResolvedValue(0)
  raceAgentCount.mockResolvedValue(0)
  agentVersionCount.mockResolvedValue(0)
  transaction.mockResolvedValue([])
})

describe("DELETE /api/user/strategies/[id]", () => {
  it.each(["DRAFT", "SUBMITTED", "CHANGES_REQUESTED"])("deletes a %s strategy", async (status) => {
    strategyFindUnique.mockResolvedValue({ status })
    expect((await remove()).status).toBe(200)
    expect(transaction).toHaveBeenCalledOnce()
  })

  it.each(["APPROVED", "CERTIFIED"])("keeps a %s strategy", async (status) => {
    strategyFindUnique.mockResolvedValue({ status })
    expect((await remove()).status).toBe(400)
    expect(transaction).not.toHaveBeenCalled()
  })

  it("keeps a strategy a hackathon application points at", async () => {
    strategyFindUnique.mockResolvedValue({ status: "SUBMITTED" })
    applicationCount.mockResolvedValue(1)
    expect((await remove()).status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
  })

  it("keeps an agent page with an approved version", async () => {
    strategyFindUnique.mockResolvedValue({ status: "DRAFT" })
    agentVersionCount.mockResolvedValue(1)
    expect((await remove()).status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
  })

  it("keeps a strategy behind a race agent", async () => {
    strategyFindUnique.mockResolvedValue({ status: "DRAFT" })
    raceAgentCount.mockResolvedValue(1)
    expect((await remove()).status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
  })

  it("keeps an agent page with an approved version", async () => {
    strategyFindUnique.mockResolvedValue({ status: "DRAFT" })
    agentVersionCount.mockResolvedValue(1)
    expect((await remove()).status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
  })
})
