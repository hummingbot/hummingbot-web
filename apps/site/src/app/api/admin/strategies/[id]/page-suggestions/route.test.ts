/**
 * An admin suggesting changes to an agent page. The risks: a non-admin doing
 * it, the page itself changing (it mustn't, until the author accepts), and
 * suggestions on a page that isn't an agent's.
 */

import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { describe, it, expect, vi, beforeEach } from "vitest"

const strategyFindUnique = vi.fn()
const strategyUpdate = vi.fn()
const auth = vi.fn()
const sendEmail = vi.fn()
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategy: {
      findUnique: (...a: unknown[]) => strategyFindUnique(...a),
      update: (...a: unknown[]) => strategyUpdate(...a),
    },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/notifications", () => ({ sendAgentPageSuggestionsEmail: (id: number) => sendEmail(id) }))

const { PUT } = await import("./route")

const suggest = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/admin/strategies/7/page-suggestions", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "7" }) },
  )

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } })
  strategyFindUnique.mockResolvedValue({ id: 7, strategyType: "AGENT", title: "Grid Bot", summary: "Runs a grid.", details: null })
  sendEmail.mockResolvedValue(undefined)
})

describe("PUT /api/admin/strategies/[id]/page-suggestions", () => {
  it("is admin-only", async () => {
    auth.mockResolvedValue({ user: { id: "u", role: "STUDENT" } })
    expect((await suggest({ summary: "Better" })).status).toBe(401)
    expect(strategyUpdate).not.toHaveBeenCalled()
  })

  it("stores the suggestion, leaves the page's own text alone, and emails the authors", async () => {
    expect((await suggest({ title: "Grid Bot", summary: "Runs a BTC grid.", note: "Name the pair" })).status).toBe(200)
    const data = strategyUpdate.mock.calls[0][0].data
    expect(Object.keys(data)).toEqual(["pageSuggestions"])
    expect(data.pageSuggestions).toMatchObject({ fields: { summary: "Runs a BTC grid." }, note: "Name the pair" })
    expect(sendEmail).toHaveBeenCalledWith(7)
  })

  it("withdraws the suggestion when nothing differs, without an email", async () => {
    await suggest({ title: "Grid Bot", summary: "Runs a grid." })
    expect(strategyUpdate.mock.calls[0][0].data).toEqual({ pageSuggestions: Prisma.DbNull })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("is only for agent pages", async () => {
    strategyFindUnique.mockResolvedValue({ id: 7, strategyType: "SCRIPT", title: "x", summary: null, details: null })
    expect((await suggest({ summary: "Better" })).status).toBe(400)
  })
})
