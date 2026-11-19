/**
 * The Condor clone path: token auth, the code-access rules it shares with the
 * website, and the clone routes. The risks: cloning more than the site would
 * show, accepting a bad token by falling back to a session, and serving a
 * version that isn't APPROVED.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateApiToken, hashApiToken } from "./api-tokens"

const tokenFindUnique = vi.fn()
const tokenUpdate = vi.fn()
const userFindUnique = vi.fn()
const strategyFindUnique = vi.fn()
const versionFindMany = vi.fn()
const versionFindFirst = vi.fn()
const consentFindUnique = vi.fn()
const consentUpsert = vi.fn()
const session = vi.fn()
const access = {
  canTeamReviewStrategy: vi.fn(),
  isSubmittedToHackathon: vi.fn(),
  isRacing: vi.fn(() => false),
  freeIds: new Set<number>(),
  hasContentAccess: vi.fn(),
  hasApprovedVersion: vi.fn(),
}

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    apiToken: {
      findUnique: (...args: unknown[]) => tokenFindUnique(...args),
      update: (...args: unknown[]) => tokenUpdate(...args),
    },
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    agentConsent: {
      findUnique: (...args: unknown[]) => consentFindUnique(...args),
      upsert: (...args: unknown[]) => consentUpsert(...args),
    },
    strategy: { findUnique: (...args: unknown[]) => strategyFindUnique(...args) },
    agentVersion: {
      findMany: (...args: unknown[]) => versionFindMany(...args),
      findFirst: (...args: unknown[]) => versionFindFirst(...args),
      count: vi.fn(async () => (access.hasApprovedVersion() ? 1 : 0)),
    },
    // strategy-access internals, reached through its real getStrategyCodeAccess
    teamMember: { findMany: vi.fn(async () => (access.canTeamReviewStrategy() ? [{ teamId: "t" }] : [])) },
    application: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (JSON.stringify(where).includes("teamPreferences")) return access.canTeamReviewStrategy() ? { id: "a" } : null
        // isRacingInHackathon: an entry in a hackathon whose race isn't over
        if ((where.hackathon as { status?: { notIn?: unknown } })?.status?.notIn) return access.isRacing() ? { id: "a" } : null
        return access.isSubmittedToHackathon() ? { id: "a" } : null
      }),
    },
    strategyAccessGrant: { findFirst: vi.fn(async () => (access.hasContentAccess() ? { id: "g" } : null)) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => session() }))
vi.mock("@/botcamp/lib/hackathon-stage-advance", () => ({ advanceDueHackathonStages: async () => {} }))

const { getStrategyCodeAccess, isAwaitingAgentApproval } = await import("./strategy-access")
// getFreePreviewStrategyIds hits strategy.findMany; stub it via the prisma mock.
const { prisma } = await import("@/botcamp/lib/prisma")
;(prisma as unknown as { strategy: Record<string, unknown> }).strategy.findMany = vi.fn(async () =>
  [...access.freeIds].map((id) => ({ id })),
)
;(prisma as unknown as { strategy: Record<string, unknown> }).strategy.count = vi.fn(
  async ({ where }: { where: { id: number } }) => (access.freeIds.has(where.id) ? 1 : 0),
)

const agentRoute = await import("@/app/api/agents/[slug]/route")
const versionRoute = await import("@/app/api/agents/[slug]/versions/[version]/route")
const consentRoute = await import("@/app/api/agents/[slug]/versions/[version]/consent/route")

const agent = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  slug: "grid-bot",
  title: "Grid Bot",
  summary: null,
  status: "SUBMITTED",
  visibility: "PUBLIC",
  strategyType: "AGENT",
  authors: [{ userId: "author" }],
  ...overrides,
})

const req = (path: string, token?: string) =>
  new NextRequest(`http://localhost${path}`, token ? { headers: { authorization: `Bearer ${token}` } } : undefined)

const getAgent = (token?: string) =>
  agentRoute.GET(req("/api/agents/grid-bot", token), { params: Promise.resolve({ slug: "grid-bot" }) })
const getVersion = (version: string, token?: string) =>
  versionRoute.GET(req(`/api/agents/grid-bot/versions/${version}`, token), {
    params: Promise.resolve({ slug: "grid-bot", version }),
  })

const consentReq = (init: { token?: string; method?: string; body?: unknown } = {}) =>
  new NextRequest("http://localhost/api/agents/grid-bot/versions/2/consent", {
    method: init.method ?? "GET",
    headers: init.token ? { authorization: `Bearer ${init.token}` } : undefined,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
const consentParams = { params: Promise.resolve({ slug: "grid-bot", version: "2" }) }

const { token } = generateApiToken()

beforeEach(() => {
  vi.clearAllMocks()
  access.freeIds.clear()
  access.canTeamReviewStrategy.mockReturnValue(false)
  access.isSubmittedToHackathon.mockReturnValue(true)
  access.hasContentAccess.mockReturnValue(false)
  access.hasApprovedVersion.mockReturnValue(false)
  access.isRacing.mockReturnValue(false)
  session.mockResolvedValue(null)
  tokenFindUnique.mockImplementation(async ({ where }: { where: { tokenHash: string } }) =>
    where.tokenHash === hashApiToken(token)
      ? { id: "tok", scopes: ["agents:read"], user: { id: "member", role: "STUDENT", isMember: true } }
      : null,
  )
  strategyFindUnique.mockResolvedValue(agent())
  versionFindMany.mockResolvedValue([{ version: 2, sha256: "abc" }])
  versionFindFirst.mockResolvedValue({ id: "v2", version: 2, archive: Buffer.from("zip"), sha256: "abc" })
  consentFindUnique.mockResolvedValue(null)
  consentUpsert.mockResolvedValue({ acceptedAt: new Date("2026-11-04T00:00:00Z"), termsVersion: "condor-1" })
})

describe("generateApiToken", () => {
  it("makes distinct prefixed tokens and stores only their hash", () => {
    const a = generateApiToken()
    const b = generateApiToken()
    expect(a.token).toMatch(/^bc_[A-Za-z0-9_-]{43}$/)
    expect(a.token).not.toBe(b.token)
    expect(a.tokenHash).toBe(hashApiToken(a.token))
    expect(a.tokenHash).not.toContain(a.token)
    expect(a.token.startsWith(a.prefix)).toBe(true)
  })
})

describe("getStrategyCodeAccess", () => {
  const user = { id: "someone", role: "STUDENT", isMember: false }

  it("mirrors the website: author and admin first, then status, visibility, sign-in, paywall", async () => {
    expect(await getStrategyCodeAccess(agent({ visibility: "PRIVATE" }), { ...user, id: "author" })).toBe("ok")
    expect(await getStrategyCodeAccess(agent({ visibility: "PRIVATE" }), { ...user, role: "ADMIN" })).toBe("ok")

    access.isSubmittedToHackathon.mockReturnValue(false)
    expect(await getStrategyCodeAccess(agent(), user)).toBe("not_found")
    access.isSubmittedToHackathon.mockReturnValue(true)

    expect(await getStrategyCodeAccess(agent({ visibility: "PRIVATE" }), user)).toBe("private")
    expect(await getStrategyCodeAccess(agent(), null)).toBe("sign_in")
    expect(await getStrategyCodeAccess(agent(), user)).toBe("payment")
    expect(await getStrategyCodeAccess(agent(), { ...user, isMember: true })).toBe("ok")

    access.freeIds.add(7)
    expect(await getStrategyCodeAccess(agent(), user)).toBe("ok")
    expect(await getStrategyCodeAccess(agent(), null)).toBe("sign_in")
  })

  it("treats an approved agent version as published, under the same visibility and paywall", async () => {
    const draft = agent({ status: "DRAFT" })
    access.isSubmittedToHackathon.mockReturnValue(false)
    expect(await getStrategyCodeAccess(draft, { ...user, isMember: true })).toBe("not_found")

    access.hasApprovedVersion.mockReturnValue(true)
    expect(await getStrategyCodeAccess(draft, { ...user, isMember: true })).toBe("ok")
    expect(await getStrategyCodeAccess(draft, user)).toBe("payment")
    expect(await getStrategyCodeAccess(draft, null)).toBe("sign_in")
    expect(await getStrategyCodeAccess(agent({ status: "DRAFT", visibility: "PRIVATE" }), user)).toBe("private")
  })

  // MEMBERS_ONLY was folded into PUBLIC; a row that still says it reads as PUBLIC
  it("treats a leftover MEMBERS_ONLY strategy like a PUBLIC one", async () => {
    const membersOnly = agent({ status: "CERTIFIED", visibility: "MEMBERS_ONLY" })
    expect(await getStrategyCodeAccess(membersOnly, user)).toBe("payment")
    access.hasContentAccess.mockReturnValue(true)
    expect(await getStrategyCodeAccess(membersOnly, user)).toBe("ok")
  })

  it("hides a strategy racing in a hackathon, certified, approved and free or not", async () => {
    const certified = agent({ status: "CERTIFIED" })
    access.hasApprovedVersion.mockReturnValue(true)
    access.freeIds.add(7)
    access.isRacing.mockReturnValue(true)
    expect(await getStrategyCodeAccess(certified, { ...user, isMember: true })).toBe("racing")
    expect(await getStrategyCodeAccess(certified, { ...user, id: "author" })).toBe("ok")
    expect(await getStrategyCodeAccess(certified, { ...user, role: "ADMIN" })).toBe("ok")
    access.canTeamReviewStrategy.mockReturnValue(true)
    expect(await getStrategyCodeAccess(certified, user)).toBe("ok")
    access.canTeamReviewStrategy.mockReturnValue(false)
    access.isRacing.mockReturnValue(false)
    expect(await getStrategyCodeAccess(certified, { ...user, isMember: true })).toBe("ok")
  })
})

describe("GET /api/agents/[slug]", () => {
  it("lists approved versions for a valid token, and marks it used", async () => {
    const res = await getAgent(token)
    expect(res.status).toBe(200)
    expect((await res.json()).data).toMatchObject({ agentId: "7", slug: "grid-bot", latest: 2 })
    expect(versionFindMany.mock.calls[0][0].where).toEqual({ strategyId: 7, status: "APPROVED" })
    expect(tokenUpdate).toHaveBeenCalled()
  })

  it("rejects a bad token instead of falling back to the session", async () => {
    session.mockResolvedValue({ user: { id: "member" } })
    const res = await getAgent("bc_not-a-real-token")
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/Invalid, expired or revoked token/)
  })

  it("requires sign-in, and points to Connect Botcamp rather than a pasted token", async () => {
    const res = await getAgent()
    expect(res.status).toBe(401)
    const { error } = await res.json()
    expect(error).toMatch(/connect Condor to Botcamp/)
    expect(error).not.toMatch(/dashboard\/profile\?tab=condor|Authorization: Bearer/)
  })

  it("applies the paywall to a non-member", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "tok",
      scopes: ["agents:read"],
      user: { id: "someone", role: "STUDENT", isMember: false },
    })
    expect((await getAgent(token)).status).toBe(402)
  })

  // Security review 2026-11 (L9): legacy tokens had no expiry at all.
  it("refuses a legacy token once a TTL has passed since it was made", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "tok",
      scopes: ["agents:read"],
      expiresAt: null,
      createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
      user: { id: "member", role: "STUDENT", isMember: true },
    })
    const res = await getAgent(token)
    expect(res.status).toBe(401)
  })

  it("never treats a token as its owner's admin role", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "tok",
      scopes: ["agents:read"],
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      user: { id: "boss", role: "ADMIN", isMember: false },
    })
    strategyFindUnique.mockResolvedValue(agent({ visibility: "PRIVATE" }))
    const res = await getAgent(token)
    expect(res.status).toBe(403)
  })

  it("refuses an expired token", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "tok",
      scopes: ["agents:read"],
      expiresAt: new Date(Date.now() - 1000),
      user: { id: "member", role: "STUDENT", isMember: true },
    })
    const res = await getAgent(token)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/expired/)
  })

  it("refuses a token without the read scope", async () => {
    tokenFindUnique.mockResolvedValue({ id: "tok", scopes: [], user: { id: "member", role: "STUDENT", isMember: true } })
    expect((await getAgent(token)).status).toBe(403)
  })

  it("treats non-agent strategies as not found", async () => {
    strategyFindUnique.mockResolvedValue(agent({ strategyType: "SCRIPT" }))
    expect((await getAgent(token)).status).toBe(404)
  })
})

describe("GET /api/agents/[slug]/versions/[version]", () => {
  it("doesn't require a consent: Botcamp only stores the one Condor sends", async () => {
    expect((await getVersion("latest", token)).status).toBe(200)
    expect(consentFindUnique).not.toHaveBeenCalled()
  })

  it("serves only an APPROVED version, with its sha256", async () => {
    const res = await getVersion("latest", token)
    expect(res.status).toBe(200)
    expect(res.headers.get("x-agent-sha256")).toBe("abc")
    expect(res.headers.get("x-agent-version")).toBe("2")
    expect(versionFindFirst.mock.calls[0][0].where).toEqual({ strategyId: 7, status: "APPROVED" })

    await getVersion("1", token)
    expect(versionFindFirst.mock.calls[1][0].where).toEqual({ strategyId: 7, status: "APPROVED", version: 1 })
  })

  it("404s a version that isn't approved, and 400s a bad version", async () => {
    versionFindFirst.mockResolvedValue(null)
    expect((await getVersion("3", token)).status).toBe(404)
    expect((await getVersion("abc", token)).status).toBe(400)
  })
})

describe("/api/agents/[slug]/versions/[version]/consent", () => {
  const SHA = "a".repeat(64)
  const pin = { agentId: "7", sha256: SHA }
  const valid = { accepted: true, ...pin, termsVersion: "condor-1" }
  const accept = (body: unknown, t: string | null = token, version = "2") =>
    consentRoute.POST(consentReq({ token: t ?? undefined, method: "POST", body }), {
      params: Promise.resolve({ slug: "grid-bot", version }),
    })
  const check = (query: Record<string, string> = pin, t: string | null = token) =>
    consentRoute.GET(
      new NextRequest(`http://localhost/api/agents/grid-bot/versions/2/consent?${new URLSearchParams(query)}`, {
        headers: t ? { authorization: `Bearer ${t}` } : undefined,
      }),
      consentParams,
    )

  beforeEach(() => {
    versionFindFirst.mockResolvedValue({ id: "v2", version: 2, sha256: SHA })
  })

  it("GET says whether this person already consented to this exact version", async () => {
    const res = await check()
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({
      agentId: "7", slug: "grid-bot", version: 2, sha256: SHA, accepted: false, acceptedAt: null, termsVersion: null,
    })
    expect(versionFindFirst.mock.calls[0][0].where).toEqual({ strategyId: 7, status: "APPROVED", version: 2 })
    expect(consentFindUnique.mock.calls[0][0].where).toEqual({
      userId_agentVersionId: { userId: "member", agentVersionId: "v2" },
    })
  })

  it("applies the clone access rules before anything else", async () => {
    expect((await check(pin, null)).status).toBe(401)
    strategyFindUnique.mockResolvedValue(agent({ visibility: "PRIVATE" }))
    expect((await accept(valid)).status).toBe(403)
    expect(consentUpsert).not.toHaveBeenCalled()
  })

  it("stores the consent for this version, with the Condor connection's id and never the token or IP", async () => {
    const res = await accept(valid)
    expect(res.status).toBe(201)
    expect((await res.json()).data).toMatchObject({ agentId: "7", accepted: true, acceptedAt: "2026-11-04T00:00:00.000Z" })
    const { create } = consentUpsert.mock.calls[0][0]
    expect(create).toEqual({
      userId: "member", agentVersionId: "v2", sha256: SHA, termsVersion: "condor-1", apiTokenId: "tok",
    })
    expect(JSON.stringify(create)).not.toContain(token)
  })

  it("is idempotent: a second accept keeps the first", async () => {
    consentFindUnique.mockResolvedValue({ acceptedAt: new Date("2026-11-01T00:00:00Z"), termsVersion: "condor-0" })
    const res = await accept(valid)
    expect(res.status).toBe(200)
    expect((await res.json()).data).toMatchObject({ acceptedAt: "2026-11-01T00:00:00.000Z", termsVersion: "condor-0" })
    expect(consentUpsert).not.toHaveBeenCalled()
  })

  it("is for an exact version: `latest` and unapproved versions are refused", async () => {
    expect((await accept(valid, token, "latest")).status).toBe(400)
    versionFindFirst.mockResolvedValue(null)
    expect((await accept(valid)).status).toBe(404)
    expect(consentUpsert).not.toHaveBeenCalled()
  })

  it("requires the agent id, the digest and the terms version", async () => {
    for (const body of [
      { ...valid, agentId: undefined },
      { ...valid, sha256: undefined },
      { ...valid, sha256: "not-a-digest" },
      { ...valid, termsVersion: undefined },
      { ...valid, termsVersion: "  " },
      { ...valid, termsVersion: "x".repeat(65) },
    ]) {
      expect((await accept(body)).status).toBe(400)
    }
    expect((await check({ agentId: "7" })).status).toBe(400)
    expect((await check({ sha256: SHA })).status).toBe(400)
    expect(consentUpsert).not.toHaveBeenCalled()
  })

  it("409s when the slug now names another agent, or the version other bytes", async () => {
    expect((await accept({ ...valid, agentId: "8" })).status).toBe(409)
    expect((await accept({ ...valid, sha256: "b".repeat(64) })).status).toBe(409)
    expect((await check({ ...pin, sha256: "b".repeat(64) })).status).toBe(409)
    expect(consentUpsert).not.toHaveBeenCalled()
    // The digest isn't case-sensitive.
    expect((await accept({ ...valid, sha256: SHA.toUpperCase() })).status).toBe(201)
  })

  it("needs an explicit accept, and only from Condor, not a browser session", async () => {
    expect((await accept({ ...valid, accepted: false })).status).toBe(400)
    session.mockResolvedValue({ user: { id: "member" } })
    userFindUnique.mockResolvedValue({ id: "member", role: "STUDENT", isMember: true })
    expect((await accept(valid, null)).status).toBe(403)
    expect(consentUpsert).not.toHaveBeenCalled()
  })
})

describe("isAwaitingAgentApproval", () => {
  it("hides only flagged registry agents with no approved version", () => {
    expect(isAwaitingAgentApproval({ agentApprovalRequired: true, agentVersions: [] })).toBe(true)
    expect(isAwaitingAgentApproval({ agentApprovalRequired: true, agentVersions: [{ id: "v" }] })).toBe(false)
    expect(isAwaitingAgentApproval({ agentApprovalRequired: false, agentVersions: [] })).toBe(false)
  })
})
