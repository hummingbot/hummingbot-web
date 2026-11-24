/**
 * Signup answers "an account with this email already exists". The risk: it
 * did so with no limit, so the form tested addresses for accounts by the
 * thousand (security review 2026-11). The per-IP cap now comes first.
 */

import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

const userFindUnique = vi.fn(async () => ({ id: "existing" }))
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: { user: { findUnique: (...a: unknown[]) => userFindUnique(...(a as [])) } } }))
const rateLimitByIp = vi.fn()
vi.mock("@/botcamp/lib/rate-limit", () => ({
  rateLimitByIp: (...a: unknown[]) => rateLimitByIp(...a),
  rateLimitedResponse: () => Response.json({ error: "Too many requests" }, { status: 429 }),
}))
vi.mock("@/botcamp/lib/resend", () => ({ sendVerificationEmail: vi.fn() }))
vi.mock("@/botcamp/lib/disposable-email", () => ({ isDisposableEmail: vi.fn(async () => false), DISPOSABLE_EMAIL_ERROR: "" }))
vi.mock("@/botcamp/lib/email-alias", () => ({ mailboxHasAccount: vi.fn(async () => false), EMAIL_ALIAS_ERROR: "" }))
vi.mock("@/botcamp/lib/sign-in-code-limit", () => ({ recordCodeEmail: vi.fn(), CODE_EMAIL_LIMIT_ERROR: "", MAX_CODE_EMAILS_PER_IP_PER_HOUR: 20 }))

const { POST } = await import("./route")

const signup = () =>
  POST(
    new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: "someone@example.com", firstName: "Ada", lastName: "L", agreedToTerms: true }),
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    }),
  )

describe("POST /api/auth/signup", () => {
  it("refuses over the per-IP cap before saying whether the account exists", async () => {
    rateLimitByIp.mockResolvedValueOnce({ ok: false, retryAfterSeconds: 60 })
    expect((await signup()).status).toBe(429)
    expect(userFindUnique).not.toHaveBeenCalled()
  })

  it("counts every attempt against the caller's IP", async () => {
    rateLimitByIp.mockResolvedValueOnce({ ok: true })
    expect((await signup()).status).toBe(400)
    expect(rateLimitByIp.mock.calls[0][0]).toBe("signup")
  })
})
