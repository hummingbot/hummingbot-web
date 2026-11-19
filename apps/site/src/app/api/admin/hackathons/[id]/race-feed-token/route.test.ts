import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { hashRaceFeedToken } from "@/botcamp/lib/race-feed"

const auth = vi.fn()
const hackathonUpdateMany = vi.fn()

vi.mock("@/botcamp/lib/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }))
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: { hackathon: { updateMany: (...args: unknown[]) => hackathonUpdateMany(...args) } },
}))

const { POST, DELETE } = await import("./route")

const params = Promise.resolve({ id: "hackathon-1" })
const request = (method: string) =>
  new NextRequest("http://localhost/api/admin/hackathons/hackathon-1/race-feed-token", { method })

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: "admin", role: "ADMIN" } })
  hackathonUpdateMany.mockReset().mockResolvedValue({ count: 1 })
})

describe("race feed token", () => {
  it("is admin-only", async () => {
    auth.mockResolvedValue({ user: { id: "u", role: "STUDENT" } })
    expect((await POST(request("POST"), { params })).status).toBe(401)
    expect((await DELETE(request("DELETE"), { params })).status).toBe(401)
    expect(hackathonUpdateMany).not.toHaveBeenCalled()
  })

  it("returns the new token once and stores only its digest", async () => {
    const res = await POST(request("POST"), { params })

    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    const { data } = await res.json()
    const stored = hackathonUpdateMany.mock.calls[0][0]
    expect(stored.where).toEqual({ id: "hackathon-1" })
    expect(stored.data.raceFeedTokenHash).toBe(hashRaceFeedToken(data.token))
    expect(JSON.stringify(stored)).not.toContain(data.token)
  })

  it("revokes by clearing the digest", async () => {
    const res = await DELETE(request("DELETE"), { params })
    expect(res.status).toBe(200)
    expect(hackathonUpdateMany).toHaveBeenCalledWith({
      where: { id: "hackathon-1" },
      data: { raceFeedTokenHash: null, raceFeedTokenCreatedAt: null },
    })
  })

  it("404s for an unknown hackathon", async () => {
    hackathonUpdateMany.mockResolvedValue({ count: 0 })
    expect((await POST(request("POST"), { params })).status).toBe(404)
  })
})
