/**
 * Strategy image uploads. The risk covered here: resources on an agent page,
 * which is its reviewed package and its text only.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyFindUnique = vi.fn()
const imageCreate = vi.fn()
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategyAuthor: { findUnique: vi.fn().mockResolvedValue({ userId: "author", strategyId: 7 }) },
    strategy: { findUnique: (...a: unknown[]) => strategyFindUnique(...a) },
    strategyImage: { create: (...a: unknown[]) => imageCreate(...a), count: vi.fn().mockResolvedValue(0) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { id: "author" } }) }))
vi.mock("@/botcamp/lib/strategy-edit", () => ({ canEditStrategyContent: vi.fn().mockResolvedValue(true) }))

const { POST } = await import("./route")

const upload = () => {
  const form = new FormData()
  form.append("file", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }), "flow.png")
  return POST(new NextRequest("http://localhost/api/user/strategies/7/images", { method: "POST", body: form }), {
    params: Promise.resolve({ id: "7" }),
  })
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/user/strategies/[id]/images", () => {
  it("refuses resources on an agent page", async () => {
    strategyFindUnique.mockResolvedValue({ status: "DRAFT", strategyType: "AGENT" })
    const res = await upload()
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Agents don't take images/)
    expect(imageCreate).not.toHaveBeenCalled()
  })
})
