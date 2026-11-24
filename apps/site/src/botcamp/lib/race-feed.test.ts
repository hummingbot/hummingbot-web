import { describe, it, expect, vi, beforeEach } from "vitest"

const applicationFindMany = vi.fn()
const upsert = vi.fn((args: unknown) => ({ op: "upsert", args }))
const receiptCreate = vi.fn((args: unknown) => ({ op: "receipt", args }))
const transaction = vi.fn(async (ops: unknown[]) => ops)

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    application: { findMany: (...args: unknown[]) => applicationFindMany(...args) },
    raceMetric: { upsert: (args: unknown) => upsert(args) },
    raceFeedReceipt: { create: (args: unknown) => receiptCreate(args) },
    $transaction: (ops: unknown[]) => transaction(ops),
  },
}))

const { checkRaceFeedAuth, generateRaceFeedToken, hashRaceFeedToken, ingestRaceReading, raceReadingSchema } = await import(
  "./race-feed"
)

const hackathon = { id: "h1", teamIds: ["t1"] }
const NOW = new Date("2026-10-06T12:00:00Z")

const app = (id: string, slug: string) => ({
  id,
  user: { name: null, firstName: "Ada", lastName: "L", avatarUrl: null },
  strategy: { slug, title: slug },
  selectedTeam: { slug: "bitget", name: "Bitget", sortOrder: 1 },
})

beforeEach(() => {
  applicationFindMany.mockReset().mockResolvedValue([app("app1", "quad-threat"), app("app2", "perp-xemm")])
  upsert.mockClear()
  receiptCreate.mockClear()
  transaction.mockClear()
})

describe("feed tokens", () => {
  it("generates long random tokens and stores only their digest", () => {
    const a = generateRaceFeedToken()
    const b = generateRaceFeedToken()
    expect(a.token).toMatch(/^rft_[A-Za-z0-9_-]{43}$/)
    expect(a.token).not.toBe(b.token)
    expect(a.hash).toBe(hashRaceFeedToken(a.token))
    expect(a.hash).not.toContain(a.token)
  })

  it("is disabled while the hackathon has no token", () => {
    expect(checkRaceFeedAuth("Bearer anything", null)).toBe("disabled")
  })

  it("accepts only the exact bearer token", () => {
    const stored = hashRaceFeedToken("rft_s3cret")
    expect(checkRaceFeedAuth("Bearer rft_s3cret", stored)).toBe("ok")
    expect(checkRaceFeedAuth("bearer rft_s3cret", stored)).toBe("ok")
    expect(checkRaceFeedAuth("Bearer rft_s3cre", stored)).toBe("unauthorized")
    expect(checkRaceFeedAuth("Basic rft_s3cret", stored)).toBe("unauthorized")
    expect(checkRaceFeedAuth(null, stored)).toBe("unauthorized")
  })
})

describe("raceReadingSchema", () => {
  it("accepts the documented shape", () => {
    const ok = raceReadingSchema.safeParse({
      timestamp: "2026-10-06T12:00:00Z",
      agents: [{ agent_id: "quad-threat", pnl_quote: -1.5, volume_quote: 100 }],
    })
    expect(ok.success).toBe(true)
  })

  it("rejects a timestamp without a timezone, negative volume, or no agents", () => {
    const parse = (body: unknown) => raceReadingSchema.safeParse(body).success
    expect(parse({ timestamp: "2026-10-06 12:00", agents: [{ agent_id: "a", pnl_quote: 0, volume_quote: 0 }] })).toBe(false)
    expect(parse({ timestamp: "2026-10-06T12:00:00Z", agents: [{ agent_id: "a", pnl_quote: 0, volume_quote: -1 }] })).toBe(false)
    expect(parse({ timestamp: "2026-10-06T12:00:00Z", agents: [] })).toBe(false)
  })
})

describe("ingestRaceReading", () => {
  const reading = (agents: Array<{ agent_id: string; pnl_quote: number; volume_quote: number }>, timestamp = NOW.toISOString()) => ({
    timestamp,
    agents,
  })

  it("upserts known agents by (application, timestamp) and records unknown ids", async () => {
    const result = await ingestRaceReading(
      hackathon,
      reading([
        { agent_id: "quad-threat", pnl_quote: 12.3, volume_quote: 4500 },
        { agent_id: "typo-agent", pnl_quote: 1, volume_quote: 1 },
      ]),
      NOW,
    )

    expect(result).toEqual({ ok: true, accepted: 1, unknown: ["typo-agent"] })
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith({
      where: { applicationId_timestamp: { applicationId: "app1", timestamp: NOW } },
      create: { hackathonId: "h1", applicationId: "app1", timestamp: NOW, pnlQuote: 12.3, volumeQuote: 4500 },
      update: { pnlQuote: 12.3, volumeQuote: 4500 },
    })
    expect(receiptCreate).toHaveBeenCalledWith({
      data: { hackathonId: "h1", timestamp: NOW, accepted: 1, unknownIds: ["typo-agent"] },
    })
    // Metrics and the receipt land together or not at all.
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it("rejects a reading from the future", async () => {
    const result = await ingestRaceReading(
      hackathon,
      reading([{ agent_id: "quad-threat", pnl_quote: 1, volume_quote: 1 }], "2026-10-06T12:30:00Z"),
      NOW,
    )
    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(transaction).not.toHaveBeenCalled()
  })

  it("rejects the same agent twice in one reading", async () => {
    const result = await ingestRaceReading(
      hackathon,
      reading([
        { agent_id: "quad-threat", pnl_quote: 1, volume_quote: 1 },
        { agent_id: "quad-threat", pnl_quote: 2, volume_quote: 2 },
      ]),
      NOW,
    )
    expect(result).toMatchObject({ ok: false, status: 400 })
  })
})
