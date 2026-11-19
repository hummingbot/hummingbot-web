/**
 * Checking a sign-in code. The risk: the attempt cap was read, compared and
 * incremented in separate queries, so a burst of parallel guesses all saw
 * "under the cap" and each got a try — far more than five per code. And with
 * no cap per IP, anyone who knew an address could burn its owner's code.
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const code = { id: "c1", email: "ada@example.com", code: "482913", attempts: 0, newsletterOptIn: false }
const verificationCode = {
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    verificationCode,
    user: { findUnique: vi.fn(async () => ({ id: "u1", email: "ada@example.com", emailVerified: new Date() })) },
  },
}))
vi.mock("@/botcamp/lib/disposable-email", () => ({ isDisposableEmail: vi.fn(async () => false), DISPOSABLE_EMAIL_ERROR: "" }))
vi.mock("@/botcamp/lib/email-alias", () => ({ mailboxHasAccount: vi.fn(async () => false), EMAIL_ALIAS_ERROR: "" }))
vi.mock("@/botcamp/lib/notifications", () => ({ sendWelcomeEmail: vi.fn() }))
vi.mock("@/botcamp/lib/team-invites", () => ({ claimTeamInvites: vi.fn() }))
const rateLimitByIp = vi.fn<() => Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }>>(async () => ({ ok: true }))
vi.mock("@/botcamp/lib/rate-limit", () => ({
  rateLimitByIp: () => rateLimitByIp(),
  rateLimitedResponse: (r: { retryAfterSeconds: number }) => Response.json({}, { status: 429, headers: { "Retry-After": String(r.retryAfterSeconds) } }),
}))
const issueLoginTicket = vi.fn(async () => "ticket")
vi.mock("@/botcamp/lib/login-ticket", () => ({ issueLoginTicket: () => issueLoginTicket() }))

const { POST } = await import("./route")

const verify = (guess: string) =>
  POST(
    new NextRequest("http://localhost/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email: "ada@example.com", code: guess }),
      headers: { "content-type": "application/json" },
    }),
  )

beforeEach(() => {
  vi.clearAllMocks()
  verificationCode.findFirst.mockResolvedValue(code)
  verificationCode.deleteMany.mockResolvedValue({ count: 1 })
})

describe("POST /api/auth/verify-code", () => {
  it("counts a guess before comparing it", async () => {
    verificationCode.updateMany.mockResolvedValue({ count: 1 })
    const res = await verify("000000")
    expect(res.status).toBe(401)
    expect(verificationCode.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    })
    expect(issueLoginTicket).not.toHaveBeenCalled()
  })

  it("refuses even the right code once the attempts are used up, without deleting it", async () => {
    verificationCode.updateMany.mockResolvedValue({ count: 0 })
    const res = await verify("482913")
    expect(res.status).toBe(429)
    expect(verificationCode.deleteMany).not.toHaveBeenCalled()
    expect(issueLoginTicket).not.toHaveBeenCalled()
  })

  it("caps guesses per IP before touching anyone's code", async () => {
    rateLimitByIp.mockResolvedValueOnce({ ok: false, retryAfterSeconds: 60 })
    const res = await verify("000000")
    expect(res.status).toBe(429)
    expect(verificationCode.findFirst).not.toHaveBeenCalled()
    expect(verificationCode.updateMany).not.toHaveBeenCalled()
  })

  it("signs in once with the right code", async () => {
    verificationCode.updateMany.mockResolvedValue({ count: 1 })
    const res = await verify("482913")
    expect(res.status).toBe(200)
    expect((await res.json()).loginTicket).toBe("ticket")
  })

  it("doesn't issue a second ticket when another request already used the code", async () => {
    verificationCode.updateMany.mockResolvedValue({ count: 1 })
    verificationCode.deleteMany.mockResolvedValue({ count: 0 })
    const res = await verify("482913")
    expect(res.status).toBe(401)
    expect(issueLoginTicket).not.toHaveBeenCalled()
  })
})
