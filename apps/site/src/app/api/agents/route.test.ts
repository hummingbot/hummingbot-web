/**
 * Condor's publish (POST /api/agents). The risks: storing a bundle whose
 * digest Botcamp never verified, leaving an empty agent page behind a refused
 * publish, duplicating a version on a retry, and answering in a shape Condor
 * reads as an untrackable receipt.
 */

import { createHash } from "crypto"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateApiToken } from "@/botcamp/lib/api-tokens"

interface Version {
  id: string
  strategyId: number
  version: number
  status: string
  sha256: string
  archive: Buffer
  fileCount: number
  source: string
  sourceUrl?: string | null
  uploadedById: string
  createdAt: Date
}
interface Strategy {
  id: number
  slug: string
  title: string
  summary: string | null
  strategyType: string
  status: string
  visibility: string
  agentApprovalRequired?: boolean
  authors: string[]
}

let strategies: Strategy[]
let versions: Version[]
let hackathonEntries = 0
const tokenFindUnique = vi.fn()
let packageReads: { createdAt: Date }[] = []

const pick = (row: object, select?: Record<string, boolean>) =>
  select ? Object.fromEntries(Object.keys(select).map((k) => [k, (row as Record<string, unknown>)[k]])) : row

vi.mock("@/botcamp/lib/prisma", () => {
  const prisma = {
    apiToken: {
      findUnique: (...args: unknown[]) => tokenFindUnique(...args),
      update: vi.fn(),
    },
    strategy: {
      findFirst: vi.fn(async ({ where }: { where: { slug: { in: string[] }; authors: { some: { userId: string } } } }) => {
        const found = strategies.find(
          (s) =>
            where.slug.in.includes(s.slug) && s.strategyType === "AGENT" && s.authors.includes(where.authors.some.userId),
        )
        return found ? { id: found.id } : null
      }),
      create: vi.fn(async ({ data }: { data: Omit<Strategy, "id" | "authors"> & { authors: { create: { userId: string } } } }) => {
        const row = { ...data, id: strategies.length + 1, authors: [data.authors.create.userId] }
        strategies.push(row)
        return { id: row.id }
      }),
      delete: vi.fn(async ({ where }: { where: { id: number } }) => {
        strategies = strategies.filter((s) => s.id !== where.id)
      }),
      findMany: vi.fn(
        async ({ where }: { where: { strategyType?: string; authors: { some: { userId: string } } } }) => {
          const mine = strategies.filter((s) => s.authors.includes(where.authors.some.userId))
          // agentHoldingReviewSlot: the caller's agents, each with its newest version.
          if (where.strategyType === "AGENT") {
            return mine
              .filter((s) => s.strategyType === "AGENT")
              .map((s) => ({
                id: s.id,
                title: s.title,
                agentVersions: versions
                  .filter((v) => v.strategyId === s.id)
                  .sort((a, b) => b.version - a.version)
                  .slice(0, 1)
                  .map((v) => ({ version: v.version, status: v.status })),
                _count: {
                  agentVersions: versions.filter((v) => v.strategyId === s.id && v.status === "APPROVED").length,
                },
              }))
          }
          // strategyCapRefusal's unfinished-draft lookup: DRAFT, no approved version.
          return mine
            .filter((s) => s.status === "DRAFT" && !versions.some((v) => v.strategyId === s.id && v.status === "APPROVED"))
            .map((s) => ({ title: s.title }))
        },
      ),
    },
    strategyCreation: { deleteMany: vi.fn(), findMany: vi.fn(async () => []), create: vi.fn() },
    strategyAuthor: {
      count: vi.fn(async ({ where }: { where: { userId: string } }) =>
        strategies.filter((st) => st.authors.includes(where.userId)).length,
      ),
    },
    hackathonEntry: { count: vi.fn(async () => hackathonEntries) },
    agentVersion: {
      findFirst: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { strategyId?: number; status?: string | { in: string[] }; sourceUrl?: string; uploadedById?: string }
          select?: Record<string, boolean>
        }) => {
          const rows = versions
            .filter(
              (v) =>
                (where.strategyId === undefined || v.strategyId === where.strategyId) &&
                (!where.status ||
                  (typeof where.status === "string" ? v.status === where.status : where.status.in.includes(v.status))) &&
                (where.sourceUrl === undefined || v.sourceUrl === where.sourceUrl) &&
                (where.uploadedById === undefined || v.uploadedById === where.uploadedById) &&
                // findAgentPage's `strategy: { authors }` — the page must still be the caller's.
                (where.uploadedById === undefined ||
                  strategies.some((st) => st.id === v.strategyId && st.authors.includes(where.uploadedById!))),
            )
            .sort((a, b) => b.version - a.version)
          return rows[0] ? pick(rows[0], select) : null
        },
      ),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: { data: Omit<Version, "id" | "status" | "createdAt"> }) => {
        const row = { ...data, id: `ver_${versions.length + 1}`, status: "PENDING", createdAt: new Date("2026-10-23T12:00:00.123Z") }
        versions.push(row)
        return row
      }),
    },
    // packageReadLimitError: a fresh hour each test unless one fills it
    rateLimitHit: {
      deleteMany: vi.fn(),
      findMany: vi.fn(async () => packageReads),
      create: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  }
  return { prisma }
})
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => null }))
// The site's exchange vocabulary, for the venues a new page is prefilled with.
vi.mock("@/botcamp/lib/strategy-tags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/botcamp/lib/strategy-tags")>()),
  getExistingValues: async () => ({ tags: [], exchanges: ["gate", "binance"] }),
}))
vi.mock("@/botcamp/lib/slug", () => ({
  generateUniqueSlug: async (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
}))

const { POST } = await import("./route")

const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex")

const AGENT_MD = "---\nname: Grid Bot\nagent_key: claude-acp:sonnet\n---\n\n# Grid Bot\n"
const LOOP_MD = "---\ndefault_config:\n  total_amount_quote: 800\n---\nRun the grid.\n"

// What condor/hub.py `publish` sends: the export as text, its digest, and
// echoes of the bundle's own fields.
function publishBody(files: Record<string, string>, overrides: Record<string, unknown> = {}) {
  const bundle = JSON.stringify(
    {
      schema: 1,
      kind: "condor-agent-bundle",
      version: 1,
      notes: "",
      agent: { slug: "grid_bot", name: "Grid Bot", description: "Runs a grid.", agent_uid: "uid_1" },
      files: Object.entries(files).map(([path, text]) => ({ path, sha256: sha256(text), text })),
    },
    null,
    2,
  )
  return { slug: "grid_bot", agent_uid: "uid_1", version: 1, notes: "", digest: sha256(bundle), bundle, ...overrides }
}

const valid = () => ({ "AGENT.md": AGENT_MD, "loops/grid/loop.md": LOOP_MD, "routines/check.py": "print('ok')\n" })

const token = generateApiToken().token
const post = (body: unknown, auth: string | null = token) =>
  POST(
    new NextRequest("http://localhost/api/agents", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: auth ? { authorization: `Bearer ${auth}` } : {},
    }),
  )

const signedIn = (scopes = ["agents:read", "agents:publish"]) =>
  tokenFindUnique.mockResolvedValue({ id: "tok", scopes, expiresAt: null, user: { id: "author", role: "STUDENT", isMember: true } })

beforeEach(() => {
  strategies = []
  versions = []
  hackathonEntries = 0
  packageReads = []
  tokenFindUnique.mockReset()
  signedIn()
})

describe("POST /api/agents", () => {
  it("asks a signed-out Condor to connect, pointing at Connect Botcamp", async () => {
    const res = await post(publishBody(valid()), null)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/connect Condor to Botcamp/)
  })

  it("refuses a token without the publish scope", async () => {
    signedIn(["agents:read"])
    expect((await post(publishBody(valid()))).status).toBe(403)
  })

  // Security review 2026-11 (L11): publishing wasn't capped before the work.
  it("caps publishes per hour before reading the body", async () => {
    packageReads = Array.from({ length: 30 }, () => ({ createdAt: new Date() }))
    const res = await post("not even JSON")
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBeTruthy()
  })

  it("refuses a bundle with more files than an agent may have, before checking them", async () => {
    const files = Object.fromEntries(Array.from({ length: 901 }, (_, i) => [`routines/r${i}.py`, "print(1)\n"]))
    const res = await post(publishBody({ ...valid(), ...files }))
    expect(res.status).toBe(400)
    expect(JSON.stringify(await res.json())).toMatch(/carries 904 files; an agent's folder may have 900/)
  })

  it("prefills a new page's exchanges from the package's connectors", async () => {
    await post(publishBody({ ...valid(), "loops/grid/loop.md": "---\ndefault_config:\n  connector_name: gate_io_perpetual\n---\nRun.\n" }))
    expect(strategies[0]).toMatchObject({ exchanges: ["gate"] })
  })

  it("publishes a new agent as a private draft page with a PENDING version", async () => {
    const body = publishBody(valid())
    const res = await post(body)
    expect(res.status).toBe(202)

    // The contract's bare receipt — no { data } envelope Condor would misread.
    expect(await res.json()).toEqual({
      submission_id: "ver_1",
      status: "pending",
      agent_uid: "uid_1",
      slug: "grid_bot",
      version: 1,
      digest: sha256(body.bundle),
      bytes: Buffer.byteLength(body.bundle),
      submitted_at: "2026-10-23T12:00:00Z",
    })
    expect(strategies).toEqual([
      expect.objectContaining({
        title: "Grid Bot",
        summary: "Runs a grid.",
        strategyType: "AGENT",
        status: "DRAFT",
        visibility: "PRIVATE",
        authors: ["author"],
      }),
    ])
    expect(versions[0]).toMatchObject({
      strategyId: 1,
      version: 1,
      source: "CONDOR",
      sourceUrl: "condor:agent/uid_1",
      uploadedById: "author",
      fileCount: 3,
    })
    // A member's page needs no approval to be listed later.
    expect(strategies[0].agentApprovalRequired).toBe(false)
  })

  it("finds the agent's page again by its agent_uid after a rename", async () => {
    await post(publishBody(valid()))
    // Renamed in Condor: a new slug and name, same agent_uid, new bytes.
    const renamed = publishBody({ ...valid(), "routines/check.py": "print('v2')\n" })
    const bundle = JSON.parse(renamed.bundle)
    bundle.agent = { ...bundle.agent, slug: "grid_bot_pro", name: "Grid Bot Pro" }
    renamed.bundle = JSON.stringify(bundle)
    renamed.digest = sha256(renamed.bundle)
    versions[0].status = "APPROVED"

    const res = await post(renamed)
    expect(res.status).toBe(202)
    expect(strategies).toHaveLength(1)
    expect(versions[1]).toMatchObject({ strategyId: 1, version: 2 })
  })

  it("holds a non-member's new page back until a version is approved", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "tok",
      scopes: ["agents:read", "agents:publish"],
      expiresAt: null,
      user: { id: "author", role: "STUDENT", isMember: false },
    })
    expect((await post(publishBody(valid()))).status).toBe(202)
    expect(strategies[0].agentApprovalRequired).toBe(true)
  })

  it("applies the website's strategy limit before making a page", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "tok",
      scopes: ["agents:read", "agents:publish"],
      expiresAt: null,
      user: { id: "author", role: "STUDENT", isMember: false },
    })
    hackathonEntries = 1
    for (let i = 0; i < 20; i++) {
      strategies.push({
        id: 100 + i, slug: `s${i}`, title: "x", summary: null, strategyType: "SCRIPT",
        status: "DRAFT", visibility: "PRIVATE", authors: ["author"],
      })
    }
    const res = await post(publishBody(valid()))
    expect(res.status).toBe(403)
    expect(versions).toHaveLength(0)
  })

  it("adds a version to the author's own page for the agent, matching its slug with hyphens", async () => {
    strategies.push({
      id: 9, slug: "grid-bot", title: "Grid Bot", summary: null, strategyType: "AGENT",
      status: "APPROVED", visibility: "PUBLIC", authors: ["author"],
    })
    versions.push({
      id: "ver_old", strategyId: 9, version: 1, status: "APPROVED", sha256: "old", archive: Buffer.from(""),
      fileCount: 1, source: "ZIP", uploadedById: "author", createdAt: new Date(),
    })

    const res = await post(publishBody(valid()))
    expect(res.status).toBe(202)
    expect((await res.json()).version).toBe(2)
    expect(strategies).toHaveLength(1)
    expect(versions[1]).toMatchObject({ strategyId: 9, version: 2 })
  })

  it("doesn't publish onto somebody else's page that shares the slug", async () => {
    strategies.push({
      id: 9, slug: "grid-bot", title: "Theirs", summary: null, strategyType: "AGENT",
      status: "APPROVED", visibility: "PUBLIC", authors: ["someone-else"],
    })
    expect((await post(publishBody(valid()))).status).toBe(202)
    expect(strategies).toHaveLength(2)
    expect(versions[0].strategyId).toBe(2)
  })

  it("answers a retry of the same bytes with the version it already made", async () => {
    const body = publishBody(valid())
    const first = await (await post(body)).json()
    const again = await post(body)
    expect(again.status).toBe(202)
    expect((await again.json()).submission_id).toBe(first.submission_id)
    expect(versions).toHaveLength(1)
  })

  it("refuses a bundle with files outside the agent structure, naming them, and stores nothing", async () => {
    const res = await post(publishBody({ ...valid(), "loops/grid/learnings.md": "- notes\n", "tests/test_x.py": "def test(): ...\n" }))
    expect(res.status).toBe(400)
    const { reasons } = await res.json()
    expect(reasons[0]).toEqual({
      rule: "structural",
      detail: expect.stringMatching(/2 file\(s\) aren't part of the agent structure.*loops\/grid\/learnings\.md, tests\/test_x\.py/),
    })
    expect(versions).toHaveLength(0)
  })

  it("takes a possible key, flagged for the review (SEC review C2)", async () => {
    const hex = "4c0883a69102937d6231471b5dbb6204fe512961708279f1b7e0f4e6a6b01f4c"

    const res = await post(publishBody({ ...valid(), "routines/check.py": `TX = "${hex}"\n` }))

    expect(res.status).toBe(202)
    expect(JSON.stringify((versions[0] as unknown as { warnings: unknown }).warnings)).toMatch(/may be a private key/)
  })

  it("refuses a bundle whose digest it can't reproduce, before anything is stored", async () => {
    const res = await post(publishBody(valid(), { digest: "0".repeat(64) }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      status: "rejected",
      reasons: [{ rule: "structural", detail: expect.stringMatching(/digest/) }],
    })
    expect(strategies).toHaveLength(0)
  })

  it("refuses a file that doesn't match its own sha256", async () => {
    const body = publishBody(valid())
    const bundle = body.bundle.replace("print('ok')", "print('tampered')")
    const res = await post({ ...body, bundle, digest: sha256(bundle) })
    expect(res.status).toBe(400)
    expect((await res.json()).reasons[0].detail).toMatch(/routines\/check\.py doesn't match its own sha256/)
  })

  it("answers a structure failure as a rejection, with no page left behind", async () => {
    const res = await post(publishBody({ "AGENT.md": "---\ntools: []\n---\n" }))
    expect(res.status).toBe(400)
    const { status, reasons } = await res.json()
    expect(status).toBe("rejected")
    expect(reasons).toEqual([{ rule: "structural", detail: "AGENT.md: Frontmatter `name` is required" }])
    expect(strategies).toHaveLength(0)
  })

  it("names a secret as a secret-scan rejection", async () => {
    const res = await post(publishBody({ ...valid(), "routines/.env": "API_KEY=1\n" }))
    expect((await res.json()).reasons).toEqual([
      { rule: "secret-scan", detail: "routines/.env: Looks like a secrets file — remove it before uploading" },
    ])
  })

  it("takes back the page it made when the version can't be stored", async () => {
    const { prisma } = await import("@/botcamp/lib/prisma")
    vi.mocked(prisma.agentVersion.create).mockRejectedValueOnce(new Error("db down"))
    expect((await post(publishBody(valid()))).status).toBe(500)
    expect(strategies).toHaveLength(0)
  })

  it("keeps a page that was already there when the version can't be stored", async () => {
    strategies.push({
      id: 9, slug: "grid-bot", title: "Grid Bot", summary: null, strategyType: "AGENT",
      status: "DRAFT", visibility: "PRIVATE", authors: ["author"],
    })
    const { prisma } = await import("@/botcamp/lib/prisma")
    vi.mocked(prisma.agentVersion.create).mockRejectedValueOnce(new Error("db down"))
    expect((await post(publishBody(valid()))).status).toBe(500)
    expect(strategies).toHaveLength(1)
  })

  it("holds a Condor publish to the website's one-in-review limit", async () => {
    await post(publishBody(valid()))
    const res = await post(publishBody({ ...valid(), "routines/check.py": "print('v2')\n" }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/still being reviewed/)
  })
})
