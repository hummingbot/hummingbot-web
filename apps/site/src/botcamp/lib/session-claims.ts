import { cache } from "react"
import { prisma } from "@/botcamp/lib/prisma"

/**
 * Role and membership ride in the session JWT, and nearly every admin check
 * reads `session.user.role` straight from it. They used to be set at sign-in
 * and never again, so an admin who was demoted (or a member whose access was
 * removed) kept it until the token expired — up to 30 days.
 *
 * The jwt callback now re-reads them from the database at most once a
 * CLAIMS_TTL_MS per token, and ends the session of a deleted user. Where the
 * refreshed token can't be saved (server components and route handlers only
 * read cookies), the TTL can't hold between requests, so the lookup is
 * memoized per request instead: a page calling auth() from several
 * components reads the user once, not once per call.
 * Skipped on the edge runtime (middleware), which has no Prisma; middleware
 * only routes instructors, and every admin page and API checks again.
 */
export const CLAIMS_TTL_MS = 60 * 1000

export interface SessionClaims {
  id?: unknown
  role?: unknown
  isMember?: unknown
  claimsCheckedAt?: unknown
}

// React's per-request memo on the server; outside a request it just calls through.
const loadClaims = cache((id: string) =>
  prisma.user.findUnique({ where: { id }, select: { role: true, isMember: true } }),
)

export async function refreshSessionClaims<T extends SessionClaims>(token: T, now = Date.now()): Promise<T | null> {
  if (typeof token.id !== "string") return token
  if (typeof token.claimsCheckedAt === "number" && now - token.claimsCheckedAt < CLAIMS_TTL_MS) return token
  if (process.env.NEXT_RUNTIME === "edge") return token

  let user: { role: string; isMember: boolean } | null
  try {
    user = await loadClaims(token.id)
  } catch (error) {
    // Auth.js clears the session cookie when this callback throws, so a
    // database blip would sign people out. Keep the claims as they were and
    // try again on the next read.
    console.error("Failed to refresh session claims:", error)
    return token
  }
  if (!user) return null
  return { ...token, role: user.role, isMember: user.isMember, claimsCheckedAt: now }
}
