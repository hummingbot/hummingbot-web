import { describe, expect, it } from "vitest"
import { safeCallbackUrl } from "./app-url"

describe("safeCallbackUrl", () => {
  it("keeps paths on this site", () => {
    expect(safeCallbackUrl("/strategies/foo")).toBe("/strategies/foo")
    expect(safeCallbackUrl("/hackathons/x/apply?team=a#top")).toBe("/hackathons/x/apply?team=a#top")
  })

  it("falls back when missing", () => {
    expect(safeCallbackUrl(null)).toBe("/dashboard")
    expect(safeCallbackUrl("")).toBe("/dashboard")
    expect(safeCallbackUrl(undefined, "/")).toBe("/")
  })

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://evil.example/login",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "\\\\evil.example",
    "/.//evil.example",
    "/..//evil.example",
    "/a/..//evil.example",
    "/%2e//evil.example",
    "/%2e%2e//evil.example",
    "/./\\evil.example",
    "/.\\\\evil.example",
  ])("rejects %j", (value) => {
    expect(safeCallbackUrl(value)).toBe("/dashboard")
  })
})
