/**
 * Strategy zip download, which Condor's importer fetches. The rules: strategy
 * code always needs sign-in, even when isFree; isFree only waives the
 * membership/unlock gate; PRIVATE wins over isFree.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyFindUnique = vi.fn()
const fileFindMany = vi.fn()
const auth = vi.fn()

const freeIds = new Set<number>()
let racing = false

// The real decideStrategyCodeAccess runs; only its database reads are stubbed.
// The strategy is a hackathon entry whose race is over unless `racing` is set.
// Rate limits have their own tests (src/lib/rate-limit.test.ts)
vi.mock("@/botcamp/lib/rate-limit", () => ({
  rateLimit: async () => ({ ok: true }),
  rateLimitByIp: async () => ({ ok: true }),
  rateLimitedResponse: () => Response.json({ error: "Too many requests" }, { status: 429 }),
}))

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategy: {
      findUnique: (...args: unknown[]) => strategyFindUnique(...args),
      findMany: vi.fn(async () => [...freeIds].map((id) => ({ id }))),
      count: vi.fn(async ({ where }: { where: { id: number } }) => (freeIds.has(where.id) ? 1 : 0)),
    },
    strategyFile: { findMany: (...args: unknown[]) => fileFindMany(...args) },
    user: { findUnique: vi.fn().mockResolvedValue({ isMember: false }) },
    teamMember: { findMany: vi.fn().mockResolvedValue([]) },
    application: {
      findFirst: vi.fn(async ({ where }: { where: { hackathon?: { status?: { notIn?: unknown } } } }) =>
        where.hackathon?.status?.notIn ? (racing ? { id: "a" } : null) : { id: "a" },
      ),
    },
    agentVersion: { count: vi.fn().mockResolvedValue(0) },
    strategyAccessGrant: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}))

vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))

const { GET } = await import("./route")

const download = () =>
  GET(new NextRequest("http://localhost/api/strategies/grid-bot/files/download-all"), {
    params: Promise.resolve({ slug: "grid-bot" }),
  })

const strategy = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  title: "Grid Bot",
  status: "SUBMITTED",
  visibility: "PUBLIC",
  isFree: false,
  authors: [{ userId: "author" }],
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  freeIds.clear()
  racing = false
  auth.mockResolvedValue(null)
  fileFindMany.mockResolvedValue([
    { filename: "AGENT.md", content: "# Grid Bot", type: "FILE", url: null },
  ])
})

describe("GET /api/strategies/[slug]/files/download-all", () => {
  it("requires sign-in even for an isFree strategy", async () => {
    strategyFindUnique.mockResolvedValue(strategy({ isFree: true }))
    freeIds.add(7)
    const res = await download()
    expect(res.status).toBe(401)
    expect(fileFindMany).not.toHaveBeenCalled()
  })

  it("serves an isFree strategy's zip to a signed-in non-member", async () => {
    auth.mockResolvedValue({ user: { id: "someone", role: "STUDENT" } })
    strategyFindUnique.mockResolvedValue(strategy({ isFree: true }))
    freeIds.add(7)
    const res = await download()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/zip")
  })

  it("hides a free strategy's zip while it races in a hackathon", async () => {
    auth.mockResolvedValue({ user: { id: "someone", role: "STUDENT", isMember: true } })
    strategyFindUnique.mockResolvedValue(strategy({ isFree: true, status: "CERTIFIED" }))
    freeIds.add(7)
    racing = true
    const res = await download()
    expect(res.status).toBe(403)
    expect(fileFindMany).not.toHaveBeenCalled()
  })

  it("keeps a PRIVATE strategy closed even when isFree", async () => {
    strategyFindUnique.mockResolvedValue(strategy({ isFree: true, visibility: "PRIVATE" }))
    const res = await download()
    expect(res.status).toBe(403)
    expect(fileFindMany).not.toHaveBeenCalled()
  })

  it("still asks a signed-in non-member to pay for a strategy that isn't free", async () => {
    auth.mockResolvedValue({ user: { id: "someone", role: "STUDENT" } })
    strategyFindUnique.mockResolvedValue(strategy())
    const res = await download()
    expect(res.status).toBe(402)
  })
})
