/**
 * Following a magic link. The risk: the link was spent before the account was
 * made, so when creating the user failed (a username taken since signup, a
 * database error) the link was dead and the person couldn't get in with it.
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const db = {
  verificationToken: { deleteMany: vi.fn() },
  verificationCode: { findFirst: vi.fn(), deleteMany: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
}
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: db }))
vi.mock("@/botcamp/lib/notifications", () => ({ sendWelcomeEmail: vi.fn() }))
vi.mock("@/botcamp/lib/team-invites", () => ({ claimTeamInvites: vi.fn() }))
vi.mock("@/botcamp/lib/login-ticket", () => ({ issueLoginTicket: vi.fn(async () => "ticket") }))
vi.mock("@/botcamp/lib/app-url", () => ({ safeCallbackUrl: () => "/dashboard" }))

const { GET } = await import("./route")

const follow = () => GET(new NextRequest("http://localhost/api/auth/callback/email?token=t0k&email=ada@example.com"))

beforeEach(() => {
  vi.clearAllMocks()
  db.verificationToken.deleteMany.mockResolvedValue({ count: 1 })
  db.verificationCode.findFirst.mockResolvedValue({ id: "v1", username: "ada", firstName: "Ada", lastName: "L" })
  db.user.findUnique.mockResolvedValue(null)
  db.user.create.mockResolvedValue({ id: "u1", email: "ada@example.com" })
})

describe("GET /api/auth/callback/email", () => {
  it("spends the link in the transaction that creates the account", async () => {
    const res = await follow()
    expect(res.headers.get("location")).toContain("/auth/signin-with-email")
    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(db.user.create).toHaveBeenCalled()
  })

  it("throws out of the transaction when the account can't be created, so the link survives", async () => {
    db.user.create.mockRejectedValue(new Error("db down"))
    const res = await follow()
    expect(res.headers.get("location")).toContain("error=Verification")
    // The deleteMany ran inside the transaction that threw: rolled back
    expect(db.verificationToken.deleteMany).toHaveBeenCalledTimes(1)
  })

  it("falls back to a generated username when the one from signup was taken since", async () => {
    db.user.findUnique.mockImplementation(async ({ where }: { where: { email?: string; slug?: string } }) =>
      where.slug === "ada" ? { id: "someone-else" } : null,
    )
    await follow()
    expect(db.user.create.mock.calls[0][0].data.slug).toBe("ada-l")
  })

  it("refuses a spent or expired link", async () => {
    db.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
    const res = await follow()
    expect(res.headers.get("location")).toContain("error=Invalid")
    expect(db.user.create).not.toHaveBeenCalled()
  })
})
