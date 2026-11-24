import { createHash, randomBytes } from "crypto"
import type { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"

// Personal access tokens (see the ApiToken model). A token is "bc_" + 32
// random bytes; only its sha256 is stored, so a database leak doesn't leak
// usable tokens, and the plaintext is returned exactly once at creation.

export const API_TOKEN_PREFIX = "bc_"
export const MAX_API_TOKENS_PER_USER = 10

// Tokens expire so a leaked one doesn't stay valid forever, and none can be
// renewed: the person connects Condor again with a new code
// (src/lib/connect-code.ts).
export const API_TOKEN_TTL_DAYS = 90
const DAY_MS = 24 * 60 * 60 * 1000

export function apiTokenExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + API_TOKEN_TTL_DAYS * DAY_MS)
}

// Tokens that still work: not expired. A legacy row without an expiry gets
// the same TTL from its creation — such tokens used to live forever.
export function activeApiTokenWhere(userId: string) {
  return {
    userId,
    OR: [
      { expiresAt: { gt: new Date() } },
      { expiresAt: null, createdAt: { gt: new Date(Date.now() - API_TOKEN_TTL_DAYS * DAY_MS) } },
    ],
  }
}

/** When a token stops working; a legacy row expires a TTL after it was made. */
export function apiTokenExpiresAt(token: { expiresAt: Date | null; createdAt: Date }): Date {
  return token.expiresAt ?? apiTokenExpiry(token.createdAt)
}

// The bc_ token in an `Authorization: Bearer` header, or null.
export function bearerApiToken(request: NextRequest): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")
  return match && match[1].startsWith(API_TOKEN_PREFIX) ? match[1] : null
}

// What a token may do. A browser session may do both.
export const SCOPE_AGENTS_READ = "agents:read"
export const SCOPE_AGENTS_PUBLISH = "agents:publish"
export const ALL_SCOPES = [SCOPE_AGENTS_READ, SCOPE_AGENTS_PUBLISH]

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function generateApiToken(): { token: string; tokenHash: string; prefix: string; expiresAt: Date } {
  const token = API_TOKEN_PREFIX + randomBytes(32).toString("base64url")
  return {
    token,
    tokenHash: hashApiToken(token),
    prefix: token.slice(0, API_TOKEN_PREFIX.length + 6),
    expiresAt: apiTokenExpiry(),
  }
}

export interface RequestUser {
  id: string
  role: string
  isMember: boolean
  scopes: string[]
  /** When the presented token expires; null for a session. */
  tokenExpiresAt: Date | null
  /** The presented token's id; null for a session. */
  tokenId: string | null
}

// The caller of an /api/agents route: a Bearer token when one is sent (an
// invalid or expired one is rejected rather than falling back to the session), otherwise
// the browser session. Returns null when signed out.
export async function getAgentRequestUser(request: NextRequest): Promise<RequestUser | null> {
  if (request.headers.get("authorization")) {
    const token = bearerApiToken(request)
    if (!token) return null
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash: hashApiToken(token) },
      select: {
        id: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
        user: { select: { id: true, role: true, isMember: true } },
      },
    })
    if (!apiToken) return null
    const expiresAt = apiTokenExpiresAt(apiToken)
    if (expiresAt <= new Date()) return null
    await prisma.apiToken.update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
    // A token acts for its owner's agents, never as an admin: an admin's
    // Condor token on a laptop otherwise opened every private and racing
    // agent and the admin-only paths of these routes. Admins keep the
    // membership their role implies.
    const { user } = apiToken
    const isAdmin = user.role === "ADMIN"
    return {
      id: user.id,
      role: isAdmin ? "STUDENT" : user.role,
      isMember: user.isMember || isAdmin,
      scopes: apiToken.scopes,
      tokenExpiresAt: expiresAt,
      tokenId: apiToken.id,
    }
  }

  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isMember: true },
  })
  return user && { ...user, scopes: ALL_SCOPES, tokenExpiresAt: null, tokenId: null }
}
