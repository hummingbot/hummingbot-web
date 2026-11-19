/**
 * The full strategy listing. The risk: it returns every strategy whatever its
 * visibility — until 2026-10-29 anyone could read PRIVATE drafts' write-ups
 * through it without signing in.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi } from "vitest"

const findMany = vi.fn(async () => [])
const requireAdmin = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({ prisma: { strategy: { findMany: () => findMany() } } }))
vi.mock("@/botcamp/lib/api-utils", async () => {
  const { NextResponse } = await import("next/server")
  return {
    requireAdmin: () => requireAdmin(),
    unauthorizedResponse: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  }
})

const { GET } = await import("./route")

describe("GET /api/strategies", () => {
  it("refuses anyone who isn't an admin, before reading a strategy", async () => {
    requireAdmin.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/strategies"))
    expect(res.status).toBe(401)
    expect(findMany).not.toHaveBeenCalled()
  })
})
