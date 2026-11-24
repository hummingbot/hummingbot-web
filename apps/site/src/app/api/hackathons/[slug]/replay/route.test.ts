/**
 * The Cup page's race replay frames, fetched lazily. The risks: leaking a
 * DRAFT hackathon, and serving frames the page itself wouldn't show (before
 * the board is scored).
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const hackathonFindUnique = vi.fn()
const getCachedHackathonLeaderboard = vi.fn()
const getCachedRaceReplay = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    hackathon: { findUnique: (...args: unknown[]) => hackathonFindUnique(...args) },
  },
}))

vi.mock("@/botcamp/lib/hackathon-leaderboard-data", () => ({
  LEADERBOARD_CACHE_SECONDS: 15,
  getCachedHackathonLeaderboard: (...args: unknown[]) => getCachedHackathonLeaderboard(...args),
  getCachedRaceReplay: (...args: unknown[]) => getCachedRaceReplay(...args),
}))

// api-utils imports auth for its admin helpers; this route never calls it.
vi.mock("@/botcamp/lib/auth", () => ({ auth: vi.fn() }))

const { GET } = await import("./route")

const fetchReplay = () =>
  GET(new NextRequest("https://botcamp.xyz/api/hackathons/abc/replay"), {
    params: Promise.resolve({ slug: "abc" }),
  })

const RACE_START = new Date("2026-11-01T00:00:00Z")
const RACE_END = new Date("2026-11-03T00:00:00Z")
const FRAMES = { a1: [{ hour: 0, rank: 1, position: 1, score: 0, pnlQuote: 0, volumeQuote: 0 }] }

beforeEach(() => {
  vi.clearAllMocks()
  hackathonFindUnique.mockResolvedValue({
    id: "h1",
    status: "COMPLETED",
    raceStart: RACE_START,
    raceEnd: RACE_END,
    sessions: [],
  })
  getCachedHackathonLeaderboard.mockResolvedValue({ scored: true, agents: [{ agentId: "a1" }], teamVotes: { t1: 3 } })
  getCachedRaceReplay.mockResolvedValue(FRAMES)
})

describe("GET /api/hackathons/[slug]/replay", () => {
  it("serves the frames for the race window, scored with the board's votes", async () => {
    const res = await fetchReplay()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: FRAMES })
    expect(getCachedRaceReplay).toHaveBeenCalledWith("h1", RACE_START.toISOString(), RACE_END.toISOString(), { t1: 3 })
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=15")
  })

  it("404s a DRAFT hackathon", async () => {
    hackathonFindUnique.mockResolvedValue({ id: "h1", status: "DRAFT", raceStart: RACE_START, raceEnd: RACE_END, sessions: [] })
    const res = await fetchReplay()
    expect(res.status).toBe(404)
    expect(getCachedRaceReplay).not.toHaveBeenCalled()
  })

  it("404s an unknown slug", async () => {
    hackathonFindUnique.mockResolvedValue(null)
    expect((await fetchReplay()).status).toBe(404)
  })

  it("serves no frames before the board is scored", async () => {
    getCachedHackathonLeaderboard.mockResolvedValue({ scored: false, agents: [], teamVotes: {} })
    const res = await fetchReplay()
    expect(await res.json()).toEqual({ data: {} })
    expect(getCachedRaceReplay).not.toHaveBeenCalled()
  })

  it("serves no frames without a race window", async () => {
    hackathonFindUnique.mockResolvedValue({ id: "h1", status: "REGISTRATION", raceStart: null, raceEnd: null, sessions: [] })
    const res = await fetchReplay()
    expect(await res.json()).toEqual({ data: {} })
    expect(getCachedHackathonLeaderboard).not.toHaveBeenCalled()
  })
})
