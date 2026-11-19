/**
 * The generic rate limit (security review 2026-11): strategy creation and
 * comments send email with no cap, and signup said whether an email had an
 * account before any limit applied.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const hits: { key: string; createdAt: Date }[] = []
const tx = {
  $executeRaw: vi.fn(),
  rateLimitHit: {
    deleteMany: vi.fn(),
    findMany: vi.fn(async ({ where }: { where: { key: string; createdAt: { gte: Date } } }) =>
      hits.filter((h) => h.key === where.key && h.createdAt >= where.createdAt.gte),
    ),
    create: vi.fn(async ({ data }: { data: { key: string } }) => hits.push({ key: data.key, createdAt: new Date() })),
  },
}
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } }))

const { rateLimit, rateLimitByIp } = await import("./rate-limit")

const HOUR = 60 * 60 * 1000

beforeEach(() => {
  hits.length = 0
  vi.clearAllMocks()
})

describe("rateLimit", () => {
  it("allows up to max per window, then refuses with a Retry-After", async () => {
    for (let i = 0; i < 3; i++) expect((await rateLimit("k", 3, HOUR)).ok).toBe(true)
    const refused = await rateLimit("k", 3, HOUR)
    expect(refused.ok).toBe(false)
    expect(refused.ok === false && refused.retryAfterSeconds).toBeGreaterThan(3500)
  })

  it("doesn't record a refused action, and keeps keys apart", async () => {
    for (let i = 0; i < 4; i++) await rateLimit("k", 3, HOUR)
    expect(hits.filter((h) => h.key === "k")).toHaveLength(3)
    expect((await rateLimit("other", 3, HOUR)).ok).toBe(true)
  })

  it("forgets hits older than the window", async () => {
    hits.push(...Array.from({ length: 3 }, () => ({ key: "k", createdAt: new Date(Date.now() - 2 * HOUR) })))
    expect((await rateLimit("k", 3, HOUR)).ok).toBe(true)
  })

  it("locks on the key so parallel requests count one at a time", async () => {
    await rateLimit("k", 3, HOUR)
    expect(tx.$executeRaw).toHaveBeenCalled()
  })
})

describe("rateLimitByIp", () => {
  it("keys by the caller's IP", async () => {
    await rateLimitByIp("signup", new Headers({ "x-forwarded-for": "203.0.113.7" }), 3, HOUR)
    expect(hits[0].key).toBe("signup:ip:203.0.113.7")
  })

  it("doesn't limit a request with no IP (local dev)", async () => {
    expect((await rateLimitByIp("signup", new Headers(), 0, HOUR)).ok).toBe(true)
    expect(hits).toHaveLength(0)
  })
})
