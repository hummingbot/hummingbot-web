/**
 * Linked code in a strategy's "download all" zip. The risks (security review
 * 2026-11): a linked GitHub zipball was capped as fetched, but its entries
 * were inflated without limit — a small zipball of compressible files grew
 * to tens of GB in memory — and a strategy could list any number of links.
 */

import JSZip from "jszip"
import { afterEach, describe, expect, it, vi } from "vitest"
import { embedLink, newEmbedBudget } from "./strategy-link-embed"

async function zipball(files: Record<string, Buffer | string>): Promise<Buffer> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) zip.file(`owner-repo-abc123/${path}`, content)
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
}

function serve(body: Buffer) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(body))))
}

afterEach(() => vi.unstubAllGlobals())

const REPO = "https://github.com/owner/repo"

describe("embedLink", () => {
  it("embeds a repo within the download's budget", async () => {
    serve(await zipball({ "bot.py": "print('hi')" }))
    const zip = new JSZip()
    const budget = newEmbedBudget()
    const outcome = await embedLink(zip, "root", "repo", REPO, budget)
    expect(outcome.status).toBe("embedded")
    expect(await zip.file("root/code/repo/bot.py")!.async("string")).toBe("print('hi')")
    expect(budget.links).toBe(9)
  })

  it("stops inflating once the download's budget is spent — the zip bomb case", async () => {
    // 2 MB of zeros compresses to a few KB
    serve(await zipball({ "bomb.bin": Buffer.alloc(2 * 1024 * 1024) }))
    const outcome = await embedLink(new JSZip(), "root", "repo", REPO, { bytes: 64 * 1024, links: 10 })
    expect(outcome.status).toBe("failed")
  })

  it("leaves a repo that doesn't fit out entirely, not half-copied", async () => {
    serve(await zipball({ "a.txt": Buffer.alloc(40 * 1024, 1), "b.txt": Buffer.alloc(40 * 1024, 2) }))
    const zip = new JSZip()
    const budget = { bytes: 64 * 1024, links: 10 }
    expect((await embedLink(zip, "root", "repo", REPO, budget)).status).toBe("failed")
    expect(Object.keys(zip.files).filter((p) => !zip.files[p].dir)).toEqual([])
    expect(budget.bytes).toBe(64 * 1024)
  })

  it("shares one budget across links, so many links can't add up past it", async () => {
    serve(await zipball({ "a.txt": Buffer.alloc(40 * 1024, 1) }))
    const budget = { bytes: 64 * 1024, links: 10 }
    expect((await embedLink(new JSZip(), "root", "one", REPO, budget)).status).toBe("embedded")
    expect((await embedLink(new JSZip(), "root", "two", REPO, budget)).status).toBe("failed")
  })

  it("fetches only so many links per download", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    const outcome = await embedLink(new JSZip(), "root", "repo", REPO, { bytes: 1024, links: 0 })
    expect(outcome.status).toBe("skipped")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("skips a repo with more entries than any strategy needs", async () => {
    const files: Record<string, string> = {}
    for (let i = 0; i <= 5000; i++) files[`d${i}/f.txt`] = ""
    serve(await zipball(files))
    expect((await embedLink(new JSZip(), "root", "repo", REPO, newEmbedBudget())).status).toBe("skipped")
  })

  it("counts files, not the directories around them, against the repo cap", async () => {
    const files: Record<string, string> = {}
    for (let i = 0; i < 3000; i++) files[`d${i}/f.txt`] = ""
    serve(await zipball(files))
    expect((await embedLink(new JSZip(), "root", "repo", REPO, newEmbedBudget())).status).toBe("embedded")
  })
})
