/**
 * Reading a strategy's Discussion. The PUBLIC thread is open to everyone who
 * can see the strategy's page, signed in or not. The risk it must not bring
 * back: the thread of a PRIVATE strategy, a draft or a racing entry readable
 * by someone who can't read that code (Botcamp security review 2026-11, L5);
 * nor AUTHOR / ADMIN comments to anyone but authors / admins.
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const commentFindMany = vi.fn<(...a: unknown[]) => Promise<never[]>>(async () => [])
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategy: { findUnique: async () => ({ id: 7, status: "CERTIFIED", visibility: "PUBLIC", authors: [{ userId: "author" }] }) },
    strategyComment: { findMany: (...a: unknown[]) => commentFindMany(...a) },
  },
}))
const auth = vi.fn()
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/resend", () => ({ sendEmail: vi.fn(), emailTemplates: {} }))
const decide = vi.fn()
vi.mock("@/botcamp/lib/strategy-access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/botcamp/lib/strategy-access")>()),
  decideStrategyCodeAccess: (...a: unknown[]) => decide(...a),
  sessionCodeViewer: async (session: { user?: { id: string; role: string } } | null) =>
    session?.user ? { id: session.user.id, role: session.user.role, isMember: false } : null,
}))

const { GET } = await import("./route")

const read = () => GET(new NextRequest("http://localhost/api/strategies/x/comments"), { params: Promise.resolve({ slug: "x" }) })
const visibilities = () =>
  (commentFindMany.mock.calls[0][0] as { where: { visibility: { in: string[] } } }).where.visibility.in

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: "someone", role: "STUDENT" } })
})

describe("GET /api/strategies/[slug]/comments", () => {
  it("keeps the thread of a private, draft or racing strategy closed", async () => {
    for (const access of ["private", "racing", "not_found"]) {
      decide.mockResolvedValue({ access, viewer: null })
      expect((await read()).status).not.toBe(200)
    }
    expect(commentFindMany).not.toHaveBeenCalled()
  })

  it("shows the public thread to a signed-out visitor", async () => {
    auth.mockResolvedValue(null)
    decide.mockResolvedValue({ access: "sign_in", viewer: null })
    expect((await read()).status).toBe(200)
    expect(visibilities()).toEqual(["PUBLIC"])
  })

  it("shows the public thread to someone whose code access is behind the paywall", async () => {
    decide.mockResolvedValue({ access: "payment", viewer: null })
    expect((await read()).status).toBe(200)
    expect(visibilities()).toEqual(["PUBLIC"])
  })

  it("adds author-only comments for authors and everything for admins", async () => {
    decide.mockResolvedValue({ access: "ok", viewer: "author" })
    auth.mockResolvedValue({ user: { id: "author", role: "STUDENT" } })
    await read()
    expect(visibilities()).toEqual(["PUBLIC", "AUTHOR"])

    commentFindMany.mockClear()
    auth.mockResolvedValue({ user: { id: "boss", role: "ADMIN" } })
    await read()
    expect(visibilities()).toEqual(["PUBLIC", "AUTHOR", "ADMIN"])
  })
})
