/**
 * Withdrawing a listing from Condor (contract §8.1). The risks: anyone but the
 * author taking an agent down, and a read-only token doing it.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyFindUnique = vi.fn()
const strategyUpdate = vi.fn()
const tokenFindUnique = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    apiToken: { findUnique: (...a: unknown[]) => tokenFindUnique(...a), update: vi.fn() },
    strategy: {
      findUnique: (...a: unknown[]) => strategyFindUnique(...a),
      update: (...a: unknown[]) => strategyUpdate(...a),
    },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => null }))

const { DELETE } = await import("./route")

const del = (auth: string | null = "bc_token") =>
  DELETE(new NextRequest("http://localhost/api/agents/grid-bot", { method: "DELETE", headers: auth ? { authorization: `Bearer ${auth}` } : {} }), {
    params: Promise.resolve({ slug: "grid-bot" }),
  })

const as = (id: string, scopes = ["agents:read", "agents:publish"], role = "STUDENT") =>
  tokenFindUnique.mockResolvedValue({ id: "tok", scopes, expiresAt: null, user: { id, role, isMember: true } })

beforeEach(() => {
  vi.clearAllMocks()
  as("author")
  strategyFindUnique.mockResolvedValue({ id: 9, strategyType: "AGENT", visibility: "PUBLIC", authors: [{ userId: "author" }] })
})

describe("DELETE /api/agents/[slug]", () => {
  it("makes the author's listing private", async () => {
    const res = await del()
    expect(await res.json()).toEqual({ unpublished: true })
    expect(strategyUpdate).toHaveBeenCalledWith({ where: { id: 9 }, data: { visibility: "PRIVATE" } })
  })

  it("refuses anyone but the author, and a read-only token", async () => {
    as("someone-else")
    expect((await del()).status).toBe(403)
    as("author", ["agents:read"])
    expect((await del()).status).toBe(403)
    expect(strategyUpdate).not.toHaveBeenCalled()
  })

  it("404s a listing that's gone or already private", async () => {
    strategyFindUnique.mockResolvedValue({ id: 9, strategyType: "AGENT", visibility: "PRIVATE", authors: [{ userId: "author" }] })
    expect((await del()).status).toBe(404)
    strategyFindUnique.mockResolvedValue(null)
    expect((await del()).status).toBe(404)
  })

  it("401s without a token", async () => {
    expect((await del(null)).status).toBe(401)
  })
})
