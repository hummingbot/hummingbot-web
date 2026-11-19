import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"
import { POST } from "./route"

const report = (body: string) => POST(new NextRequest("http://localhost/api/csp-report", { method: "POST", body }))

describe("POST /api/csp-report", () => {
  it("logs the blocked script and the page, nothing else", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const res = await report(
      JSON.stringify({ "csp-report": { "blocked-uri": "https://evil.example/x.js", "violated-directive": "script-src", "document-uri": "https://www.botcamp.xyz/", "script-sample": "secret" } }),
    )
    expect(res.status).toBe(204)
    expect(warn.mock.calls[0][1]).toBe(
      JSON.stringify({ blocked: "https://evil.example/x.js", directive: "script-src", page: "https://www.botcamp.xyz/" }),
    )
    warn.mockRestore()
  })

  it("answers 204 to anything else without logging it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect((await report("x".repeat(100_000))).status).toBe(204)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
