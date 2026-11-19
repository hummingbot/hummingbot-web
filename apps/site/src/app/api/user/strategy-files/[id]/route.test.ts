/**
 * Renaming a strategy file. The risk: the new name skipped the checks an
 * upload gets (security review 2026-11).
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const fileUpdate = vi.fn(async () => ({}))

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategyFile: {
      findUnique: async ({ select }: { select: Record<string, boolean> }) => (select.type ? { type: "FILE" } : { strategyId: 1 }),
      update: (...a: unknown[]) => fileUpdate(...(a as [])),
    },
    strategyAuthor: { findUnique: async () => ({ userId: "u1" }) },
    strategy: { findUnique: async () => ({ status: "DRAFT" }) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "u1", role: "STUDENT" } }) }))
vi.mock("@/botcamp/lib/strategy-edit", () => ({ canEditStrategyContent: async () => true }))

const { PUT } = await import("./route")

const rename = (filename: string) =>
  PUT(
    new NextRequest("http://localhost/api/user/strategy-files/f1", {
      method: "PUT",
      body: JSON.stringify({ filename }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "f1" }) },
  )

beforeEach(() => vi.clearAllMocks())

describe("PUT /api/user/strategy-files/[id] rename", () => {
  it("renames to an allowed name", async () => {
    expect((await rename("strategy.py")).status).toBe(200)
    expect(fileUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { filename: "strategy.py" } }))
  })

  it("refuses a type strategies can't hold", async () => {
    expect((await rename("page.html")).status).toBe(400)
    expect(fileUpdate).not.toHaveBeenCalled()
  })

  it("strips control characters and path tricks, as an upload does", async () => {
    await rename("../../etc/\u0000bot.py")
    expect(fileUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { filename: "etc/bot.py" } }))
  })
})
