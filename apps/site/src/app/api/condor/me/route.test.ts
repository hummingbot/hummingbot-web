/**
 * The token's own endpoint. The risks: describing or revoking a token
 * without presenting it, and revoking some other token.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { hashApiToken } from "@/botcamp/lib/api-tokens"

const tokenFindUnique = vi.fn()
const tokenDeleteMany = vi.fn()
const session = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    apiToken: {
      findUnique: (...args: unknown[]) => tokenFindUnique(...args),
      update: vi.fn(),
      deleteMany: (...args: unknown[]) => tokenDeleteMany(...args),
    },
    user: {
      findUnique: vi.fn(async () => ({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", slug: "ada" })),
    },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => session() }))

const { GET, DELETE } = await import("./route")

const request = (method: string, token?: string) =>
  new NextRequest("https://botcamp.test/api/condor/me", {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

beforeEach(() => {
  vi.clearAllMocks()
  session.mockResolvedValue(null)
  tokenFindUnique.mockResolvedValue({
    id: "tok",
    scopes: ["agents:read", "agents:publish"],
    expiresAt: new Date("2027-01-20T00:00:00Z"),
    user: { id: "u1", role: "STUDENT", isMember: false },
  })
  tokenDeleteMany.mockResolvedValue({ count: 1 })
})

describe("GET /api/condor/me", () => {
  it("names the token's owner, its scopes and when it expires", async () => {
    const res = await GET(request("GET", "bc_abc"))
    expect(await res.json()).toEqual({
      data: {
        user: { id: "u1", name: "Ada Lovelace", slug: "ada" },
        scopes: ["agents:read", "agents:publish"],
        expires_at: "2027-01-20T00:00:00.000Z",
      },
    })
  })

  it("401s an expired token", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "tok",
      scopes: ["agents:read"],
      expiresAt: new Date(Date.now() - 1000),
      user: { id: "u1", role: "STUDENT", isMember: false },
    })
    expect((await GET(request("GET", "bc_old"))).status).toBe(401)
  })

  it("401s a revoked token and a missing one", async () => {
    tokenFindUnique.mockResolvedValue(null)
    expect((await GET(request("GET", "bc_gone"))).status).toBe(401)
    expect((await GET(request("GET"))).status).toBe(401)
  })
})

describe("DELETE /api/condor/me", () => {
  it("revokes exactly the presented token", async () => {
    const res = await DELETE(request("DELETE", "bc_abc"))
    expect(res.status).toBe(200)
    expect(tokenDeleteMany).toHaveBeenCalledWith({ where: { tokenHash: hashApiToken("bc_abc") } })
  })

  it("needs the token itself, not a session", async () => {
    session.mockResolvedValue({ user: { id: "u1" } })
    expect((await DELETE(request("DELETE"))).status).toBe(401)
    expect(tokenDeleteMany).not.toHaveBeenCalled()
  })

  it("401s a token that's already gone", async () => {
    tokenDeleteMany.mockResolvedValue({ count: 0 })
    expect((await DELETE(request("DELETE", "bc_gone"))).status).toBe(401)
  })
})
