/**
 * Public hackathon strategy catalog (Condor's importer reads it). The risks:
 * listing a strategy whose code the download link won't serve, and leaking
 * a DRAFT hackathon.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const hackathonFindUnique = vi.fn()
const strategyFindMany = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    hackathon: { findUnique: (...args: unknown[]) => hackathonFindUnique(...args) },
    strategy: { findMany: (...args: unknown[]) => strategyFindMany(...args) },
  },
}))

// api-utils imports auth for its admin helpers; this route never calls it.
vi.mock("@/botcamp/lib/auth", () => ({ auth: vi.fn() }))

const { GET } = await import("./route")

const list = () =>
  GET(new NextRequest("https://botcamp.xyz/api/hackathons/abc/strategies"), {
    params: Promise.resolve({ slug: "abc" }),
  })

beforeEach(() => {
  vi.clearAllMocks()
  hackathonFindUnique.mockResolvedValue({ id: "h1", slug: "abc", title: "Agent Builders Cup", status: "COMPLETED" })
  strategyFindMany.mockResolvedValue([
    {
      slug: "grid-bot",
      title: "Grid Bot",
      summary: "A grid",
      strategyType: "AGENT",
      tags: [],
      exchanges: ["hyperliquid"],
      updatedAt: new Date("2026-10-10T00:00:00Z"),
      authors: [{ user: { firstName: "Ada", lastName: null, slug: "ada" } }],
      applications: [{ rank: 2, selectedTeam: { slug: "botcamp", name: "Botcamp" } }],
      agentVersions: [],
    },
  ])
})

describe("GET /api/hackathons/[slug]/hub", () => {
  it("lists strategies with something to import, agents by their approved package", async () => {
    await list()
    const { where } = strategyFindMany.mock.calls[0][0]
    expect(where).toMatchObject({
      featured: true,
      isFree: true,
      visibility: { not: "PRIVATE" },
      // An agent made in the Create Condor Agent flow has no loose files.
      OR: [{ files: { some: {} } }, { agentVersions: { some: { status: "APPROVED" } } }],
      applications: { some: { hackathonId: "h1", status: { in: ["FINALIZED", "REVIEWED"] } } },
    })
  })

  it("returns absolute download links with team and rank", async () => {
    const res = await list()
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.hackathon).toEqual({ slug: "abc", title: "Agent Builders Cup" })
    expect(data.strategies[0]).toMatchObject({
      slug: "grid-bot",
      authors: [{ name: "Ada", slug: "ada" }],
      team: { slug: "botcamp", name: "Botcamp" },
      rank: 2,
      url: "https://botcamp.xyz/hub/grid-bot",
      downloadUrl: "https://botcamp.xyz/api/strategies/grid-bot/files/download-all",
    })
    expect(data.strategies[0]).not.toHaveProperty("applications")
  })

  it("points an approved agent at its reviewed package, not its old loose files", async () => {
    strategyFindMany.mockResolvedValue([
      {
        slug: "grid-bot",
        title: "Grid Bot",
        authors: [],
        applications: [],
        agentVersions: [{ version: 3 }],
      },
    ])
    const { data } = await (await list()).json()
    expect(data.strategies[0]).toMatchObject({
      downloadUrl: "https://botcamp.xyz/api/agents/grid-bot/versions/latest",
      agentVersion: 3,
    })
    expect(data.strategies[0]).not.toHaveProperty("agentVersions")
  })

  it("hides a DRAFT hackathon", async () => {
    hackathonFindUnique.mockResolvedValue({ id: "h1", slug: "abc", title: "x", status: "DRAFT" })
    const res = await list()
    expect(res.status).toBe(404)
    expect(strategyFindMany).not.toHaveBeenCalled()
  })
})
