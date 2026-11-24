/**
 * Throwaway-inbox sign-ups. The risk: the 2026-10-29 probes made every
 * account at maxxspace.com, and a list that's silently empty or stale lets
 * that through — so a failed fetch is an error, never "not disposable".
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const LIST = ["# comment", "maxxspace.com", "mailinator.com", ...Array.from({ length: 1200 }, (_, i) => `throwaway${i}.test`)].join("\n")
const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

const { isDisposableEmail } = await import("./disposable-email")

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response(LIST, { status: 200 }))
})

describe("isDisposableEmail", () => {
  it.each([
    ["bcrce1793288988@maxxspace.com", true],
    ["Someone@MAXXSPACE.COM", true],
    ["x@inbox.mailinator.com", true],
    // Not on the community list; added for the 2026-10-29 contact-form probe.
    ["xxckvkfjizsrfjum@ethereal.email", true],
    ["mike@hummingbot.org", false],
    ["someone@gmail.com", false],
  ])("%s → %s", async (email, expected) => {
    expect(await isDisposableEmail(email)).toBe(expected)
  })

  it("throws, rather than letting every address through, when the list can't be fetched", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }))
    await expect(isDisposableEmail("a@maxxspace.com")).rejects.toThrow(/disposable email domain list/)
  })

  it("throws on a list that came back nearly empty", async () => {
    fetchMock.mockResolvedValue(new Response("maxxspace.com\n", { status: 200 }))
    await expect(isDisposableEmail("a@gmail.com")).rejects.toThrow(/only 1 entries/)
  })
})
