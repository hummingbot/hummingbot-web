/**
 * An admin changing someone's email. The risk: the Google/GitHub sign-ins
 * linked under the old address stayed attached, so whoever holds that old
 * address's Google account kept signing in (security review 2026-11, L10).
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const accountDeleteMany = vi.fn()
const userUpdate = vi.fn(async () => ({ id: "u1" }))
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: async () => null,
      findUnique: async () => ({ email: "old@example.com", location: null }),
      update: (...a: unknown[]) => userUpdate(...(a as [])),
    },
    account: { deleteMany: (...a: unknown[]) => accountDeleteMany(...a) },
    $transaction: async (fn: (tx: unknown) => unknown) => fn((await import("@/botcamp/lib/prisma")).prisma),
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "admin", role: "ADMIN" } }) }))
vi.mock("@/botcamp/lib/geocode", () => ({ geocodeLocation: vi.fn() }))

const { PATCH } = await import("./route")

const patch = (body: unknown) =>
  PATCH(
    new NextRequest("http://localhost/api/users/u1", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "u1" }) },
  )

beforeEach(() => vi.clearAllMocks())

describe("PATCH /api/users/[id] email", () => {
  it("unlinks OAuth sign-ins and stores the new email lowercased", async () => {
    await patch({ email: "  New@Example.com " })
    expect(accountDeleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } })
    expect((userUpdate.mock.calls[0] as unknown[])[0]).toMatchObject({ data: { email: "new@example.com", emailVerified: null } })
  })

  it("leaves them when the email is the same, in any case", async () => {
    await patch({ email: "OLD@example.com" })
    expect(accountDeleteMany).not.toHaveBeenCalled()
  })
})
