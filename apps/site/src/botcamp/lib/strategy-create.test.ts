/**
 * Creating a strategy, under its caps. The risks, all from the 2026-10-29
 * probe: one person holding many throwaway drafts, a create/delete loop that
 * never runs out, and many accounts behind one IP.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

let drafts: { title: string }[]
let authored: number
let creations: { userId: string; ip: string | null; createdAt: Date }[]
const strategyCreate = vi.fn()
const creationCreate = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => {
  const prisma = {
    strategyAuthor: { count: vi.fn(async () => authored) },
    strategy: {
      findMany: vi.fn(async () => drafts),
      create: (...args: unknown[]) => strategyCreate(...args),
    },
    strategyCreation: {
      deleteMany: vi.fn(),
      findMany: vi.fn(async ({ where }: { where: { userId?: string; ip?: string; createdAt: { gte: Date } } }) =>
        creations
          .filter((c) => (where.userId ? c.userId === where.userId : c.ip === where.ip) && c.createdAt >= where.createdAt.gte)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      ),
      create: (...args: unknown[]) => creationCreate(...args),
    },
    $executeRaw: vi.fn(),
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  }
  return { prisma }
})
vi.mock("@/botcamp/lib/slug", () => ({ generateUniqueSlug: vi.fn().mockResolvedValue("grid-bot") }))

const { createStrategy, MAX_CREATES_PER_IP_PER_DAY, MAX_CREATES_PER_USER_PER_DAY } = await import("./strategy-create")

const create = (overrides: { role?: string; ip?: string | null; userId?: string } = {}) =>
  createStrategy({
    userId: overrides.userId ?? "u1",
    role: overrides.role ?? "STUDENT",
    ip: overrides.ip === undefined ? "203.0.113.7" : overrides.ip,
    title: "Grid Bot",
    data: { status: "DRAFT", visibility: "PRIVATE" },
  })

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000)

beforeEach(() => {
  vi.clearAllMocks()
  drafts = []
  authored = 0
  creations = []
  strategyCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data }))
})

describe("createStrategy", () => {
  it("creates the strategy and records the create against the person and IP", async () => {
    const result = await create()
    expect(result).toMatchObject({ strategy: { title: "Grid Bot", slug: "grid-bot" } })
    expect(creationCreate).toHaveBeenCalledWith({ data: { userId: "u1", ip: "203.0.113.7" } })
  })

  it("refuses a second unfinished draft, naming the one to finish", async () => {
    drafts = [{ title: "Old Draft" }]
    const result = await create()
    expect(result).toEqual({
      refusal: { error: 'Finish or delete your draft "Old Draft" before starting another strategy', status: 403 },
    })
    expect(strategyCreate).not.toHaveBeenCalled()
    expect(creationCreate).not.toHaveBeenCalled()
  })

  it("counts creates of strategies since deleted, and says when the quota frees up", async () => {
    // Five creates in the window; the strategies themselves may be long gone.
    creations = Array.from({ length: MAX_CREATES_PER_USER_PER_DAY }, (_, i) => ({ userId: "u1", ip: null, createdAt: hoursAgo(20 - i) }))
    const result = await create()
    expect(result).toMatchObject({ refusal: { status: 429 } })
    // The oldest of the five leaves the window 4 hours from now.
    const retry = "refusal" in result ? result.refusal.retryAfterSeconds! : 0
    expect(retry).toBeGreaterThan(4 * 3600 - 60)
    expect(retry).toBeLessThanOrEqual(4 * 3600)
  })

  it("caps creates per IP across accounts", async () => {
    creations = Array.from({ length: MAX_CREATES_PER_IP_PER_DAY }, (_, i) => ({ userId: `acct${i}`, ip: "203.0.113.7", createdAt: hoursAgo(1) }))
    expect(await create({ userId: "fresh" })).toMatchObject({ refusal: { status: 429 } })
    // Without a proxy IP (local dev) only the person's own quota applies.
    expect(await create({ userId: "fresh", ip: null })).toHaveProperty("strategy")
  })

  it("counts an IPv6 caller by its /64, so rotating addresses doesn't reset the IP quota", async () => {
    creations = Array.from({ length: MAX_CREATES_PER_IP_PER_DAY }, (_, i) => ({ userId: `acct${i}`, ip: "2001:db8:aa:1::/64", createdAt: hoursAgo(1) }))
    expect(await create({ userId: "fresh", ip: "2001:db8:aa:1:7::3" })).toMatchObject({ refusal: { status: 429 } })
    expect(await create({ userId: "fresh", ip: "2001:db8:aa:2::1" })).toHaveProperty("strategy")
    expect(creationCreate).toHaveBeenLastCalledWith({ data: { userId: "fresh", ip: "2001:db8:aa:2::/64" } })
  })

  it("holds admins to the overall cap only", async () => {
    drafts = [{ title: "Old Draft" }]
    creations = Array.from({ length: MAX_CREATES_PER_USER_PER_DAY }, () => ({ userId: "u1", ip: null, createdAt: hoursAgo(1) }))
    expect(await create({ role: "ADMIN" })).toHaveProperty("strategy")
    authored = 10
    expect(await create({ role: "ADMIN" })).toMatchObject({ refusal: { status: 403 } })
  })

  it("retries a unique-slug clash in a fresh transaction", async () => {
    strategyCreate.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }))
    expect(await create()).toHaveProperty("strategy")
    expect(strategyCreate).toHaveBeenCalledTimes(2)
  })
})
