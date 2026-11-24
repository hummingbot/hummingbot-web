/**
 * Database errors. The risk: the route answered with the raw Prisma message,
 * which carries the query, column names and values (security review 2026-11).
 */

import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"

const auth = vi.fn()
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: {} }))

const { POST } = await import("./route")

const post = () =>
  POST(
    new NextRequest("http://localhost/api/user/strategy-files", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }),
  )

describe("POST /api/user/strategy-files", () => {
  it("keeps a database error's text out of the response", async () => {
    auth.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Invalid `prisma.strategyFile.create()`: column "secret_col"', {
        code: "P2010",
        clientVersion: "6",
      }),
    )
    const res = await post()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toMatch(/secret_col|prisma\.|P2010/)
  })

  it("keeps any other error's text out too", async () => {
    auth.mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"))
    expect(JSON.stringify(await (await post()).json())).not.toContain("10.0.0.5")
  })
})
