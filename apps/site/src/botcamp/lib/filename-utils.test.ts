/**
 * Strategy file names end up as zip entry paths ("Download all") and in the
 * Content-Disposition header. The risk: the 2026-10-29 probe stored
 * "../../evil17236.txt" (a zip-slip on extraction) and "a\r\nX-Inj: 1.txt"
 * (header injection).
 */

import { describe, it, expect } from "vitest"
import { attachmentDisposition, sanitizeUploadFilename } from "./filename-utils"

describe("sanitizeUploadFilename", () => {
  it.each([
    ["../../evil17236.txt", "evil17236.txt"],
    ["/etc/passwd", "etc/passwd"],
    ["..\\..\\win.ini", "win.ini"],
    ["a\r\nX-Inj: 1.txt", "aX-Inj: 1.txt"],
    ["controllers/./market_making/../pmm.py", "controllers/market_making/pmm.py"],
    // Folder paths that agent and fleet imports store stay as they are.
    ["controllers/generic/v37_scalp_multi.py", "controllers/generic/v37_scalp_multi.py"],
  ])("%j → %j", (input, expected) => {
    expect(sanitizeUploadFilename(input)).toBe(expected)
  })

  it.each(["..", "./..", "", "\r\n", "a".repeat(256)])("refuses %j", (input) => {
    expect(sanitizeUploadFilename(input)).toBeNull()
  })
})

describe("attachmentDisposition", () => {
  it("never carries a line break or an unescaped quote, even for a name stored before sanitizing", () => {
    const value = attachmentDisposition('a\r\nX-Inj: 1".txt')
    expect(value).not.toMatch(/[\r\n]/)
    expect(value).toBe(`attachment; filename="aX-Inj: 1_.txt"; filename*=UTF-8''aX-Inj%3A%201%22.txt`)
  })

  it("downloads a stored path under its last segment", () => {
    expect(attachmentDisposition("controllers/generic/pmm.py")).toBe(
      `attachment; filename="pmm.py"; filename*=UTF-8''pmm.py`,
    )
  })
})
