/**
 * Admin team create. The risks: a new team sorting ahead of every existing
 * one, and a team created from the hackathon editor not joining the hackathon.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const teamFindUnique = vi.fn()
const teamCreate = vi.fn()
const teamAggregate = vi.fn()
const hackathonFindUnique = vi.fn()
const hackathonUpdate = vi.fn()

const db = {
  team: {
    findUnique: (...args: unknown[]) => teamFindUnique(...args),
    create: (...args: unknown[]) => teamCreate(...args),
    aggregate: (...args: unknown[]) => teamAggregate(...args),
  },
  hackathon: {
    findUnique: (...args: unknown[]) => hackathonFindUnique(...args),
    update: (...args: unknown[]) => hackathonUpdate(...args),
  },
}

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) },
}))

vi.mock("@/botcamp/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin", role: "ADMIN" } }),
}))

const { POST } = await import("./route")

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/admin/teams", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  )

beforeEach(() => {
  vi.clearAllMocks()
  teamFindUnique.mockResolvedValue(null)
  teamAggregate.mockResolvedValue({ _max: { sortOrder: 6 } })
  teamCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "t-new", ...data }))
})

describe("POST /api/admin/teams", () => {
  it("places a new team after the existing ones", async () => {
    const res = await post({ name: "Hyperliquid", slug: "hyperliquid" })
    expect(res.status).toBe(201)
    expect(teamCreate.mock.calls[0][0].data.sortOrder).toBe(7)
    expect(hackathonUpdate).not.toHaveBeenCalled()
  })

  it("keeps an explicit sort order", async () => {
    await post({ name: "Hyperliquid", slug: "hyperliquid", sortOrder: 2 })
    expect(teamCreate.mock.calls[0][0].data.sortOrder).toBe(2)
  })

  it("adds the team to the hackathon when hackathonId is given", async () => {
    hackathonFindUnique.mockResolvedValue({ id: "h1" })
    const res = await post({ name: "Hyperliquid", slug: "hyperliquid", hackathonId: "h1" })
    expect(res.status).toBe(201)
    expect(hackathonUpdate).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: { teamIds: { push: "t-new" } },
    })
  })

  it("creates nothing for an unknown hackathon", async () => {
    hackathonFindUnique.mockResolvedValue(null)
    const res = await post({ name: "Hyperliquid", slug: "hyperliquid", hackathonId: "missing" })
    expect(res.status).toBe(404)
    expect(teamCreate).not.toHaveBeenCalled()
  })

  it("rejects a taken slug", async () => {
    teamFindUnique.mockResolvedValue({ id: "t1" })
    const res = await post({ name: "Gate", slug: "gate" })
    expect(res.status).toBe(409)
    expect(teamCreate).not.toHaveBeenCalled()
  })
})
