/**
 * Strategy detail — the parts the agent registry added. The risks: an
 * unapproved registry agent reachable by link, and the "Import to Condor"
 * card offering a version that isn't approved.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyFindUnique = vi.fn()
const strategyFindFirst = vi.fn<(args: unknown) => Promise<{ id: number } | null>>(async () => null)
const auth = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategy: {
      findUnique: (args: { select?: unknown }) => strategyFindUnique(args),
      findFirst: (args: unknown) => strategyFindFirst(args),
    },
    user: { findUnique: vi.fn().mockResolvedValue({ isMember: false }) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/race-data-guard", () => ({ raceDataBlocksDelete: vi.fn() }))
// decideStrategyCodeAccess has its own tests (agent-registry.test.ts); here a
// non-author gets `access` (not_found when unpublished), an author always gets in.
let access = "payment"
let published = true
vi.mock("@/botcamp/lib/strategy-access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/botcamp/lib/strategy-access")>()),
  getFreePreviewStrategyIds: vi.fn().mockResolvedValue(new Set()),
  isSubmittedToHackathon: vi.fn().mockResolvedValue(false),
  isFreePreviewStrategy: vi.fn(async () => false),
  decideStrategyCodeAccess: vi.fn(
    async (strategy: { authors: { userId: string }[] }, user: { id: string } | null) =>
      user && strategy.authors.some((a) => a.userId === user.id)
        ? { access: "ok", viewer: "author" }
        : { access: published ? access : "not_found", viewer: null },
  ),
}))

const { GET } = await import("./route")

const get = () =>
  GET(new NextRequest("http://localhost/api/strategies/grid-bot"), { params: Promise.resolve({ slug: "grid-bot" }) })

const strategy = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  slug: "grid-bot",
  title: "Grid Bot",
  status: "DRAFT",
  visibility: "PUBLIC",
  strategyType: "AGENT",
  agentApprovalRequired: false,
  agentVersions: [{ version: 3 }],
  files: [],
  images: [],
  students: [],
  authors: [{ user: { id: "author" } }],
  cohortRelation: null,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  access = "payment"
  published = true
  auth.mockResolvedValue({ user: { id: "someone", role: "STUDENT" } })
  // The exact-slug probe and the full fetch both go through findUnique.
  strategyFindUnique.mockImplementation(async ({ select }: { select?: Record<string, unknown> }) =>
    select && Object.keys(select).length === 1 ? { id: 7 } : strategy(),
  )
})

describe("GET /api/strategies/[slug] — agent registry", () => {
  it("offers the latest approved version for Condor, and only approved ones are selected", async () => {
    const body = await (await get()).json()
    expect(body.condorVersion).toBe(3)
    expect(body).not.toHaveProperty("agentVersions")
    const { select } = strategyFindUnique.mock.calls.at(-1)![0]
    expect(select.agentVersions).toMatchObject({ where: { status: "APPROVED" }, orderBy: { version: "desc" }, take: 1 })
  })

  it("offers nothing for an agent with no approved version, or a non-agent", async () => {
    strategyFindUnique.mockImplementation(async ({ select }: { select?: Record<string, unknown> }) =>
      select && Object.keys(select).length === 1 ? { id: 7 } : strategy({ agentVersions: [] }),
    )
    expect((await (await get()).json()).condorVersion).toBeNull()

    strategyFindUnique.mockImplementation(async ({ select }: { select?: Record<string, unknown> }) =>
      select && Object.keys(select).length === 1 ? { id: 7 } : strategy({ strategyType: "SCRIPT" }),
    )
    expect((await (await get()).json()).condorVersion).toBeNull()
  })

  it("404s an unapproved registry agent for anyone but its author", async () => {
    strategyFindUnique.mockImplementation(async ({ select }: { select?: Record<string, unknown> }) =>
      select && Object.keys(select).length === 1
        ? { id: 7 }
        : strategy({ agentApprovalRequired: true, agentVersions: [] }),
    )
    expect((await get()).status).toBe(404)
    auth.mockResolvedValue({ user: { id: "author", role: "STUDENT" } })
    expect((await get()).status).toBe(200)
  })

  // Security review of #110: the file routes stopped serving these, but the
  // page data still listed them, link URLs included.
  it("doesn't list an approved agent's old loose files to a viewer with content access", async () => {
    access = "ok"
    const oldLink = { id: "f1", type: "LINK", filename: "repo", url: "https://github.com/x/unreviewed" }
    strategyFindUnique.mockImplementation(async ({ select }: { select?: Record<string, unknown> }) =>
      select && Object.keys(select).length === 1 ? { id: 7 } : strategy({ files: [oldLink] }),
    )
    expect((await (await get()).json()).files).toEqual([])
    auth.mockResolvedValue({ user: { id: "author", role: "STUDENT" } })
    expect((await (await get()).json()).files).toEqual([oldLink])
  })

  it("hides a certified strategy's code and resources while it races, except from its author", async () => {
    access = "racing"
    const file = { id: "f1", type: "FILE", filename: "bot.py", url: null }
    const image = { id: "i1", filename: "chart.png" }
    strategyFindUnique.mockImplementation(async ({ select }: { select?: Record<string, unknown> }) =>
      select && Object.keys(select).length === 1
        ? { id: 7 }
        : strategy({ status: "CERTIFIED", strategyType: "SCRIPT", agentVersions: [], files: [file], images: [image] }),
    )
    const body = await (await get()).json()
    expect(body).toMatchObject({ isRacing: true, hasContentAccess: false, files: [], images: [] })

    auth.mockResolvedValue({ user: { id: "author", role: "STUDENT" } })
    expect(await (await get()).json()).toMatchObject({ isRacing: false, hasContentAccess: true, files: [file] })
  })

  // Security review 2026-11: drafts' write-ups were served to anyone, and
  // their files and link URLs to members.
  it("404s a strategy that isn't published to anyone but its author", async () => {
    published = false
    access = "not_found"
    expect((await get()).status).toBe(404)
    auth.mockResolvedValue(null)
    expect((await get()).status).toBe(404)
    auth.mockResolvedValue({ user: { id: "author", role: "STUDENT" } })
    expect((await get()).status).toBe(200)
  })

  it("hands decideStrategyCodeAccess the caller with fresh membership", async () => {
    const { decideStrategyCodeAccess } = await import("@/botcamp/lib/strategy-access")
    await get()
    expect(vi.mocked(decideStrategyCodeAccess).mock.calls[0][1]).toEqual({ id: "someone", role: "STUDENT", isMember: false })
    expect(vi.mocked(decideStrategyCodeAccess).mock.calls[0][0].authors).toEqual([{ userId: "author" }])
  })

  // A newer cohort's draft with the same name took over /strategies/<name>
  it("resolves a bare slug to a published strategy before an unpublished one", async () => {
    strategyFindUnique.mockImplementation(async ({ select, where }: { select?: Record<string, unknown>; where: { id?: number } }) =>
      select && Object.keys(select).length === 1 ? null : strategy({ id: where.id }),
    )
    strategyFindFirst.mockResolvedValueOnce({ id: 13 })
    await get()
    const first = strategyFindFirst.mock.calls[0][0] as { where: Record<string, unknown> }
    expect(first.where).toHaveProperty("OR")
    expect(strategyFindUnique.mock.calls.at(-1)![0].where).toEqual({ id: 13 })
  })
})
