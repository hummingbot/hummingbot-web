/**
 * An agent's code on its page. The risks: showing a version still in review
 * (edits going live without review), and showing code to someone Condor
 * wouldn't let clone it.
 */

import JSZip from "jszip"
import { NextRequest, NextResponse } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const resolveAgent = vi.fn()
const versionFindFirst = vi.fn()
vi.mock("@/botcamp/lib/agent-registry", () => ({ resolveAgentForRequest: (...a: unknown[]) => resolveAgent(...a) }))
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: { agentVersion: { findFirst: (...a: unknown[]) => versionFindFirst(...a) } } }))

const { GET } = await import("./route")

const get = (query = "") =>
  GET(new NextRequest(`http://localhost/api/strategies/grid-bot/agent-code${query}`), {
    params: Promise.resolve({ slug: "grid-bot" }),
  })

async function archiveOf(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) zip.file(path, content)
  return zip.generateAsync({ type: "uint8array" })
}

beforeEach(async () => {
  vi.clearAllMocks()
  resolveAgent.mockResolvedValue({ strategy: { id: 9 }, user: { id: "u1" } })
  versionFindFirst.mockResolvedValue({
    version: 2,
    sha256: "abc",
    archive: await archiveOf({ "AGENT.md": "---\nname: Grid\n---\n", "loops/main/loop.md": "Run.\n" }),
  })
})

describe("GET /api/strategies/[slug]/agent-code", () => {
  it("answers with Condor's own access error", async () => {
    resolveAgent.mockResolvedValue({ error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) })
    expect((await get()).status).toBe(401)
    expect(versionFindFirst).not.toHaveBeenCalled()
  })

  it("doesn't take a Condor token, which would skip the clone disclaimer", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/strategies/grid-bot/agent-code", { headers: { authorization: "Bearer bc_x" } }),
      { params: Promise.resolve({ slug: "grid-bot" }) },
    )
    expect(res.status).toBe(401)
    expect(resolveAgent).not.toHaveBeenCalled()
  })

  it("only ever reads the newest approved version", async () => {
    await get()
    expect(versionFindFirst.mock.calls[0][0]).toMatchObject({
      where: { strategyId: 9, status: "APPROVED" },
      orderBy: { version: "desc" },
    })
  })

  it("lists the approved version's files", async () => {
    const { data } = await (await get()).json()
    expect(data.version).toBe(2)
    expect(data.files.map((f: { path: string }) => f.path).sort()).toEqual(["AGENT.md", "loops/main/loop.md"])
  })

  it("serves one file's text by path, and 404s a path that isn't in it", async () => {
    const { data } = await (await get("?path=loops/main/loop.md")).json()
    expect(data.content).toBe("Run.\n")
    expect((await get("?path=../../etc/passwd")).status).toBe(404)
  })

  it("404s an agent with nothing approved yet", async () => {
    versionFindFirst.mockResolvedValue(null)
    expect((await get()).status).toBe(404)
  })
})
