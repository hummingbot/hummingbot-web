/**
 * The author answering a reviewer's page suggestion. The risks: anyone but an
 * author changing the page, accepting text nobody suggested, and a dismissal
 * that changes the page anyway.
 */

import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyFindFirst = vi.fn()
const strategyUpdate = vi.fn()
const auth = vi.fn()
const approvedCount = vi.fn()
const editState = vi.fn()
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategy: {
      findFirst: (...a: unknown[]) => strategyFindFirst(...a),
      update: (...a: unknown[]) => strategyUpdate(...a),
    },
    agentVersion: { count: (...a: unknown[]) => approvedCount(...a) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/strategy-edit", () => ({
  getHackathonEditState: () => editState(),
  canEditWithState: (state: { kind: string }, status: string) => state.kind !== "locked" && status !== "CERTIFIED",
}))
vi.mock("@/botcamp/lib/slug", () => ({ generateUniqueSlug: async (title: string) => title.toLowerCase().replace(/\s+/g, "-") }))

const { POST } = await import("./route")

const answer = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/user/strategies/7/page-suggestions", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "7" }) },
  )

const pending = {
  fields: { title: "Grid Bot Pro", summary: "Runs a BTC grid on Binance." },
  note: null,
  suggestedAt: "2026-10-30T12:00:00.000Z",
  suggestedById: "admin",
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: "author" } })
  strategyFindFirst.mockResolvedValue({ id: 7, title: "Grid Bot", status: "DRAFT", pageSuggestions: pending })
  approvedCount.mockResolvedValue(1)
  editState.mockResolvedValue({ kind: "none" })
})

describe("POST /api/user/strategies/[id]/page-suggestions", () => {
  it("only finds the strategy among the caller's own", async () => {
    strategyFindFirst.mockResolvedValue(null)
    expect((await answer({ action: "accept", field: "title" })).status).toBe(404)
    expect(strategyFindFirst.mock.calls[0][0].where).toEqual({ id: 7, authors: { some: { userId: "author" } } })
    expect(strategyUpdate).not.toHaveBeenCalled()
  })

  it("accepting writes the suggested text and drops that field from the suggestion", async () => {
    expect((await answer({ action: "accept", field: "title" })).status).toBe(200)
    expect(strategyUpdate.mock.calls[0][0].data).toEqual({
      title: "Grid Bot Pro",
      pageSuggestions: { ...pending, fields: { summary: "Runs a BTC grid on Binance." } },
    })
  })

  it("dismissing leaves the page as it is", async () => {
    await answer({ action: "dismiss", field: "summary" })
    expect(strategyUpdate.mock.calls[0][0].data).toEqual({
      pageSuggestions: { ...pending, fields: { title: "Grid Bot Pro" } },
    })
  })

  it("clears the suggestion when its last field is answered", async () => {
    strategyFindFirst.mockResolvedValue({
      id: 7,
      title: "Grid Bot",
      status: "DRAFT",
      pageSuggestions: { ...pending, fields: { title: "Grid Bot Pro" } },
    })
    await answer({ action: "dismiss", field: "title" })
    expect(strategyUpdate.mock.calls[0][0].data).toEqual({ pageSuggestions: Prisma.DbNull })
  })

  it("follows the content lock, like any edit", async () => {
    strategyFindFirst.mockResolvedValue({ id: 7, title: "Grid Bot", status: "CERTIFIED", pageSuggestions: pending })
    expect((await answer({ action: "accept", field: "title" })).status).toBe(400)
    expect(strategyUpdate).not.toHaveBeenCalled()
  })

  it("renames the slug with the name, unless an approved version pins it", async () => {
    approvedCount.mockResolvedValue(0)
    await answer({ action: "accept", field: "title" })
    expect(strategyUpdate.mock.calls[0][0].data).toMatchObject({ title: "Grid Bot Pro", slug: "grid-bot-pro" })
  })

  it("refuses a field nobody suggested, or one that isn't suggestible", async () => {
    expect((await answer({ action: "accept", field: "details" })).status).toBe(404)
    expect((await answer({ action: "accept", field: "videoURL" })).status).toBe(400)
    expect(strategyUpdate).not.toHaveBeenCalled()
  })
})
