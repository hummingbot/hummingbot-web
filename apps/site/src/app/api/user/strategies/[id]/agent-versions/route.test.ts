/**
 * Agent version upload. The risks: storing a package that failed the
 * structure check, letting a non-author upload, and taking anything but the
 * agent folder the author picked (no links to fetch from).
 */

import JSZip from "jszip"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyFindUnique = vi.fn()
// The author's agent holding the review slot (agentHoldingReviewSlot reads
// each agent's newest version), and the latest version of this one.
let pendingVersion: {
  version: number
  strategyId?: number
  title?: string
  status?: string
  /** Approved versions the agent already has. */
  approved?: number
} | null = null
let latestVersion: { version: number; sha256: string } | null = null
const versionFindFirst = vi.fn(async () => latestVersion)
const agentsFindMany = vi.fn(async () =>
  pendingVersion
    ? [
        {
          id: pendingVersion.strategyId ?? 7,
          title: pendingVersion.title ?? "Grid Bot",
          agentVersions: [{ version: pendingVersion.version, status: pendingVersion.status ?? "PENDING" }],
          _count: { agentVersions: pendingVersion.approved ?? 0 },
        },
      ]
    : [],
)
const versionFindMany = vi.fn()
const versionCreate = vi.fn()
const auth = vi.fn()
const fetchGitHubAgent = vi.fn()

const advisoryLock = vi.fn()
vi.mock("@/botcamp/lib/prisma", () => {
  const prisma = {
    strategy: {
      findUnique: (...args: unknown[]) => strategyFindUnique(...args),
      findMany: () => agentsFindMany(),
    },
    rateLimitHit: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
    agentVersion: {
      findFirst: () => versionFindFirst(),
      create: (...args: unknown[]) => versionCreate(...args),
      findMany: (...args: unknown[]) => versionFindMany(...args),
    },
    $executeRaw: (...args: unknown[]) => advisoryLock(...args),
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  }
  return { prisma }
})
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/agent-github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/botcamp/lib/agent-github")>()),
  fetchGitHubAgent: (...args: unknown[]) => fetchGitHubAgent(...args),
}))

const { POST } = await import("./route")

const AGENT_MD = "---\nname: Grid Bot\nagent_key: claude-acp:sonnet\ntools: [get_prices]\n---\n# Grid Bot\n"

const params = { params: Promise.resolve({ id: "7" }) }

async function zipOf(files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) zip.file(path, content)
  return new Blob([new Uint8Array(await zip.generateAsync({ type: "uint8array" }))], { type: "application/zip" })
}

async function uploadZip(files: Record<string, string>) {
  const form = new FormData()
  form.append("file", await zipOf(files), "agent.zip")
  return POST(new NextRequest("http://localhost/api/user/strategies/7/agent-versions", { method: "POST", body: form }), params)
}

const uploadLink = (githubUrl: string) =>
  POST(
    new NextRequest("http://localhost/api/user/strategies/7/agent-versions", {
      method: "POST",
      body: JSON.stringify({ githubUrl }),
      headers: { "content-type": "application/json" },
    }),
    params,
  )

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: "author", role: "STUDENT" } })
  strategyFindUnique.mockResolvedValue({ id: 7, strategyType: "AGENT", authors: [{ userId: "author" }] })
  pendingVersion = null
  latestVersion = null
  versionFindMany.mockResolvedValue([])
  versionCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "v", ...data, archive: undefined }))
})

describe("POST /api/user/strategies/[id]/agent-versions", () => {
  it("stores a possible key's version with a warning for the review (SEC review C2)", async () => {
    const hex = "4c0883a69102937d6231471b5dbb6204fe512961708279f1b7e0f4e6a6b01f4c"

    const res = await uploadZip({ "grid_bot/AGENT.md": AGENT_MD, "grid_bot/routines/a.py": `TX = "${hex}"\n` })

    expect(res.status).toBe(201)
    const { data } = versionCreate.mock.calls[0][0]
    expect(JSON.stringify(data.warnings)).toMatch(/may be a private key — check it before approving/)
    expect(JSON.stringify(data.warnings)).not.toContain(hex)
  })

  it("stores a valid zip as PENDING version 1, rooted at AGENT.md", async () => {
    const res = await uploadZip({ "grid_bot/AGENT.md": AGENT_MD, "grid_bot/routines/a.py": "x = 1\n" })
    expect(res.status).toBe(201)
    const { data } = versionCreate.mock.calls[0][0]
    expect(data).toMatchObject({ strategyId: 7, version: 1, source: "ZIP", fileCount: 2, uploadedById: "author" })
    expect(data.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(data).not.toHaveProperty("status") // defaults to PENDING
    const stored = await JSZip.loadAsync(data.archive)
    expect(Object.keys(stored.files).sort()).toEqual(["AGENT.md", "routines/a.py"])

  })

  it("rejects an invalid package with the report and stores nothing", async () => {
    const res = await uploadZip({ "AGENT.md": AGENT_MD, "model.pkl": "x" })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.errors).toContainEqual(expect.objectContaining({ path: "model.pkl" }))
    expect(versionCreate).not.toHaveBeenCalled()
  })

  it("refuses a non-author", async () => {
    auth.mockResolvedValue({ user: { id: "someone-else", role: "STUDENT" } })
    const res = await uploadZip({ "AGENT.md": AGENT_MD })
    expect(res.status).toBe(403)
    expect(versionCreate).not.toHaveBeenCalled()
  })

  it("requires the strategy to be an Agent", async () => {
    strategyFindUnique.mockResolvedValue({ id: 7, strategyType: "SCRIPT", authors: [{ userId: "author" }] })
    expect((await uploadZip({ "AGENT.md": AGENT_MD })).status).toBe(400)
  })

  it("bumps the version, and refuses an upload identical to the latest", async () => {
    await uploadZip({ "AGENT.md": AGENT_MD })
    const { sha256 } = versionCreate.mock.calls[0][0].data

    latestVersion = { version: 3, sha256: "other" }
    await uploadZip({ "AGENT.md": AGENT_MD + "\nmore\n" })
    expect(versionCreate.mock.calls[1][0].data.version).toBe(4)

    latestVersion = { version: 4, sha256 }
    expect((await uploadZip({ "AGENT.md": AGENT_MD })).status).toBe(409)
  })

  it("takes only the uploaded folder — a GitHub link is refused, never fetched", async () => {
    const res = await uploadLink("https://github.com/ada/grid/tree/main/agents/grid")
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Upload the agent folder/)
    expect(fetchGitHubAgent).not.toHaveBeenCalled()
    expect(versionCreate).not.toHaveBeenCalled()
  })

  it("refuses a new agent while another was rejected and not yet fixed or deleted", async () => {
    pendingVersion = { version: 2, strategyId: 12, title: "Other Agent", status: "REJECTED" }
    const res = await uploadZip({ "AGENT.md": AGENT_MD })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/"Other Agent" wasn't approved — fix it or delete it/)
  })

  it("doesn't hold the slot for a rejected update to an agent that's already approved and live", async () => {
    pendingVersion = { version: 3, strategyId: 12, title: "Live Agent", status: "REJECTED", approved: 1 }
    expect((await uploadZip({ "AGENT.md": AGENT_MD })).status).toBe(201)
  })

  it("lets the author fix the rejected agent itself", async () => {
    pendingVersion = { version: 2, strategyId: 7, title: "Grid Bot", status: "REJECTED" }
    expect((await uploadZip({ "AGENT.md": AGENT_MD })).status).toBe(201)
  })

  it("refuses an upload while another of the author's agents is in review", async () => {
    pendingVersion = { version: 1, strategyId: 12, title: "Other Agent" }
    const res = await uploadZip({ "AGENT.md": AGENT_MD })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Your agent "Other Agent" is still in review/)
    expect(versionCreate).not.toHaveBeenCalled()
  })

  it("names the version when what's in review is an update to a live agent", async () => {
    pendingVersion = { version: 2, strategyId: 12, title: "Live Agent", approved: 1 }
    const res = await uploadZip({ "AGENT.md": AGENT_MD })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Version 2 of "Live Agent" is still in review/)
    expect(versionCreate).not.toHaveBeenCalled()
  })

  it("refuses a new upload while a version is still in review", async () => {
    pendingVersion = { version: 2 }
    const res = await uploadZip({ "AGENT.md": AGENT_MD })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Version 2 is still being reviewed/)
    expect(versionCreate).not.toHaveBeenCalled()
  })

  it("caps uploads per user per day, before reading the package", async () => {
    const oldest = new Date(Date.now() - 20 * 60 * 60 * 1000)
    versionFindMany.mockResolvedValue(Array.from({ length: 5 }, (_, i) => ({ createdAt: new Date(oldest.getTime() + i) })))
    const res = await uploadZip({ "AGENT.md": AGENT_MD })
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.retryAt).toBe(new Date(oldest.getTime() + 24 * 60 * 60 * 1000).toISOString())
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(3 * 60 * 60)
    expect(versionCreate).not.toHaveBeenCalled()
    expect(versionFindMany.mock.calls[0][0].where).toMatchObject({ uploadedById: "author" })
  })

  it("lets an upload through under the cap", async () => {
    versionFindMany.mockResolvedValue(Array.from({ length: 4 }, () => ({ createdAt: new Date() })))
    expect((await uploadZip({ "AGENT.md": AGENT_MD })).status).toBe(201)
  })

  it("doesn't limit admins", async () => {
    auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } })
    pendingVersion = { version: 2 }
    versionFindMany.mockResolvedValue(Array.from({ length: 9 }, () => ({ createdAt: new Date() })))
    expect((await uploadZip({ "AGENT.md": AGENT_MD })).status).toBe(201)
  })
})
