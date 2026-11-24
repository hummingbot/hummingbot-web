/**
 * The sign-in email. The risk: a magic link built from the request's Origin
 * header — anyone could have Botcamp email someone else a genuine sign-in link
 * pointing at their own server, token included, and take the account on one
 * click (security review of 2026-10-29).
 */

import { NextRequest } from "next/server"
import { createHash } from "node:crypto"
import { describe, it, expect, vi, beforeEach } from "vitest"

const sendVerificationEmail = vi.fn()

const createToken = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(async () => ({ id: "u1", firstName: "Ada", name: null })) },
    verificationCode: { findFirst: vi.fn(async () => null), count: vi.fn(async () => 0), deleteMany: vi.fn(), create: vi.fn() },
    verificationToken: { deleteMany: vi.fn(), create: (...args: unknown[]) => createToken(...args) },
  },
}))
vi.mock("@/botcamp/lib/resend", () => ({ sendVerificationEmail: (...args: unknown[]) => sendVerificationEmail(...args) }))
vi.mock("@/botcamp/lib/disposable-email", () => ({ isDisposableEmail: vi.fn(async () => false), DISPOSABLE_EMAIL_ERROR: "" }))
vi.mock("@/botcamp/lib/email-alias", () => ({ mailboxHasAccount: vi.fn(async () => false), EMAIL_ALIAS_ERROR: "" }))
const recordCodeEmail = vi.fn()
vi.mock("@/botcamp/lib/sign-in-code-limit", () => ({
  recordCodeEmail: (...args: unknown[]) => recordCodeEmail(...args),
  CODE_EMAIL_LIMIT_ERROR: "Too many sign-in codes",
}))

const { POST } = await import("./route")

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.botcamp.xyz")
  sendVerificationEmail.mockResolvedValue({ success: true })
  recordCodeEmail.mockResolvedValue({ ok: true })
})

describe("POST /api/auth/request-code", () => {
  it("links to our own site whatever Origin the request claims", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: "victim@example.com" }),
        headers: { "content-type": "application/json", origin: "https://evil.example" },
      }),
    )
    expect(res.status).toBe(200)
    const { magicLink } = sendVerificationEmail.mock.calls[0][0] as { magicLink: string }
    expect(magicLink.startsWith("https://www.botcamp.xyz/api/auth/callback/email?token=")).toBe(true)
    expect(magicLink).not.toContain("evil.example")
  })

  it("refuses with 429 and sends nothing once the caller's IP is over its hourly cap", async () => {
    recordCodeEmail.mockResolvedValue({ ok: false, retryAfterSeconds: 600 })
    const res = await POST(
      new NextRequest("http://localhost/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: "someone@example.com" }),
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      }),
    )
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("600")
    expect(recordCodeEmail).toHaveBeenCalledWith("203.0.113.7")
    expect(sendVerificationEmail).not.toHaveBeenCalled()
  })

  it("mails a random token, stores only its hash, and leaves the code out of the link", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: "ada@example.com" }),
        headers: { "content-type": "application/json" },
      }),
    )
    expect(res.status).toBe(200)
    const { magicLink, code } = sendVerificationEmail.mock.calls[0][0] as { magicLink: string; code: string }
    const token = new URL(magicLink).searchParams.get("token")!
    expect(Buffer.from(token, "base64url").toString()).not.toContain(code)
    const stored = (createToken.mock.calls[0][0] as { data: { token: string } }).data.token
    expect(stored).not.toBe(token)
    expect(stored).toBe(createHash("sha256").update(token).digest("hex"))
  })

  it("brings the person back to the page they were headed to", async () => {
    await POST(
      new NextRequest("http://localhost/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: "ada@example.com", callbackUrl: "/dashboard/team?tab=seats" }),
        headers: { "content-type": "application/json" },
      }),
    )
    const { magicLink } = sendVerificationEmail.mock.calls[0][0] as { magicLink: string }
    expect(new URL(magicLink).searchParams.get("callbackUrl")).toBe("/dashboard/team?tab=seats")
  })

  it("never puts another site in the link's callbackUrl", async () => {
    for (const callbackUrl of ["https://evil.example/x", "//evil.example", "javascript:alert(1)"]) {
      sendVerificationEmail.mockClear()
      await POST(
        new NextRequest("http://localhost/api/auth/request-code", {
          method: "POST",
          body: JSON.stringify({ email: "ada@example.com", callbackUrl }),
          headers: { "content-type": "application/json" },
        }),
      )
      const { magicLink } = sendVerificationEmail.mock.calls[0][0] as { magicLink: string }
      expect(new URL(magicLink).searchParams.get("callbackUrl")).toBe("/dashboard")
    }
  })
})
