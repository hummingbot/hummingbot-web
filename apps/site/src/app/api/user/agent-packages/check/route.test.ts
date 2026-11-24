/**
 * Agent package check. The risks: answering anyone who isn't signed in, and
 * storing a package (or counting it against the upload limits) when this
 * only reports on it.
 */

import JSZip from "jszip"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const auth = vi.fn()
const versionCreate = vi.fn()
const readCreate = vi.fn()
const readFindMany = vi.fn()
vi.mock("@/botcamp/lib/prisma", () => {
  const prisma = {
    agentVersion: { create: (...args: unknown[]) => versionCreate(...args) },
    rateLimitHit: {
      create: (...args: unknown[]) => readCreate(...args),
      findMany: (...args: unknown[]) => readFindMany(...args),
      deleteMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  }
  return { prisma }
})
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/strategy-tags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/botcamp/lib/strategy-tags")>()),
  getExistingValues: async () => ({ tags: [], exchanges: ["gate", "XRPL", "binance"] }),
}))

const { POST } = await import("./route")

const AGENT_MD = "---\nname: Grid Bot\ndescription: Runs a BTC grid\nagent_key: claude-acp:sonnet\n---\n# Grid Bot\n"

async function check(files: Record<string, string>) {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) zip.file(path, content)
  const form = new FormData()
  form.append(
    "file",
    new Blob([new Uint8Array(await zip.generateAsync({ type: "uint8array" }))], { type: "application/zip" }),
    "agent.zip",
  )
  return POST(new NextRequest("http://localhost/api/user/agent-packages/check", { method: "POST", body: form }))
}

describe("POST /api/user/agent-packages/check", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } })
    readFindMany.mockResolvedValue([{ createdAt: new Date() }])
  })

  it("caps package reads per hour, and doesn't record a refused one", async () => {
    readFindMany.mockResolvedValue(Array.from({ length: 30 }, () => ({ createdAt: new Date() })))
    const res = await check({ "AGENT.md": AGENT_MD })
    expect(res.status).toBe(429)
    // A refused retry mustn't push the wait further out.
    expect(readCreate).not.toHaveBeenCalled()
  })

  it("records a read it lets through", async () => {
    readFindMany.mockResolvedValue(Array.from({ length: 29 }, () => ({ createdAt: new Date() })))
    expect((await check({ "AGENT.md": AGENT_MD })).status).toBe(200)
    expect(readCreate).toHaveBeenCalledWith({ data: { key: "agent-package-read:u1" } })
  })

  it("doesn't cap admins", async () => {
    auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } })
    readFindMany.mockResolvedValue(Array.from({ length: 99 }, () => ({ createdAt: new Date() })))
    expect((await check({ "AGENT.md": AGENT_MD })).status).toBe(200)
    expect(readCreate).not.toHaveBeenCalled()
  })

  it("refuses anyone who isn't signed in", async () => {
    auth.mockResolvedValue(null)
    const res = await check({ "AGENT.md": AGENT_MD })
    expect(res.status).toBe(401)
  })

  it("reports a valid package with its tree and description, and stores nothing", async () => {
    const res = await check({ "my_agent/AGENT.md": AGENT_MD, "my_agent/docs/notes.md": "# notes\n" })
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.ok).toBe(true)
    expect(data.manifest.name).toBe("Grid Bot")
    expect(data.description).toBe("Runs a BTC grid")
    expect(data.tree).toEqual([
      { path: "AGENT.md", leftOut: null },
      { path: "docs/notes.md", leftOut: null },
    ])
    expect(versionCreate).not.toHaveBeenCalled()
  })

  it("suggests the page's exchanges from the package, in the site's own names", async () => {
    const res = await check({
      "AGENT.md": AGENT_MD,
      "controllers/mm/mm.py": "class X: ...\n",
      "controllers/mm/sample_configs/a.yml": "connector_name: gate_io_perpetual\n",
      "controllers/mm/sample_configs/b.yml": "connector_name: xrpl\n",
      "controllers/mm/sample_configs/c.yml": "connector_name: some_new_dex\n",
    })
    const { data } = await res.json()
    expect(data.exchanges).toEqual(["gate", "XRPL"])
  })

  it("answers an invalid package with 200 and its errors, so the page can show them", async () => {
    const res = await check({ "README.md": "no agent here\n" })
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.ok).toBe(false)
    expect(data.errors).toEqual([{ message: "No AGENT.md found" }])
    expect(versionCreate).not.toHaveBeenCalled()
  })
})
