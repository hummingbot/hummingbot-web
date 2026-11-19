/**
 * Session claims. The risk: role and membership were written into the JWT at
 * sign-in and never re-read, so a demoted admin kept admin APIs until the
 * token expired — up to 30 days (security review 2026-11).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const userFindUnique = vi.fn()
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: { user: { findUnique: (...a: unknown[]) => userFindUnique(...a) } } }))

const { CLAIMS_TTL_MS, refreshSessionClaims } = await import("./session-claims")

const NOW = 1_800_000_000_000

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())

describe("refreshSessionClaims", () => {
  it("takes a demoted admin's role from the database", async () => {
    userFindUnique.mockResolvedValue({ role: "STUDENT", isMember: false })
    const token = await refreshSessionClaims({ id: "u1", role: "ADMIN", isMember: true, claimsCheckedAt: NOW - CLAIMS_TTL_MS }, NOW)
    expect(token).toMatchObject({ role: "STUDENT", isMember: false, claimsCheckedAt: NOW })
  })

  it("re-reads a token that never had its claims checked (issued before this change)", async () => {
    userFindUnique.mockResolvedValue({ role: "STUDENT", isMember: false })
    expect(await refreshSessionClaims({ id: "u1", role: "ADMIN" }, NOW)).toMatchObject({ role: "STUDENT" })
  })

  it("trusts a recently checked token without a query", async () => {
    const token = { id: "u1", role: "ADMIN", claimsCheckedAt: NOW - 1000 }
    expect(await refreshSessionClaims(token, NOW)).toBe(token)
    expect(userFindUnique).not.toHaveBeenCalled()
  })

  it("ends the session of a deleted user", async () => {
    userFindUnique.mockResolvedValue(null)
    expect(await refreshSessionClaims({ id: "gone", role: "ADMIN" }, NOW)).toBeNull()
  })

  it("leaves the token alone on the edge runtime, which has no database client", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge")
    const token = { id: "u1", role: "ADMIN" }
    expect(await refreshSessionClaims(token, NOW)).toBe(token)
    expect(userFindUnique).not.toHaveBeenCalled()
  })

  // Auth.js wipes the session cookie when the jwt callback throws.
  it("keeps the session through a database error", async () => {
    userFindUnique.mockRejectedValue(new Error("connection pool timeout"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    const token = { id: "u1", role: "STUDENT" }
    expect(await refreshSessionClaims(token, NOW)).toBe(token)
  })
})
