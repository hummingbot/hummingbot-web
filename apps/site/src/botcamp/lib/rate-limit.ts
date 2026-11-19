import { prisma } from "@/botcamp/lib/prisma"
import { ipLimitKey, requestIp } from "@/botcamp/lib/request-ip"

// Rows older than this are pruned whatever their key; no window is longer.
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000
const GLOBAL_PRUNE_CHANCE = 0.01

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number }

/**
 * Counts one action against `key` and says whether it's within `max` per
 * `windowMs`. The count and the insert share a transaction under a lock on
 * the key, so parallel requests can't all get under the cap. A refused action
 * isn't recorded. The one limiter for any per-user or per-IP limit the Vercel
 * WAF can't express — sign-in code emails and guesses, /connect code
 * attempts, agent package reads, signups, comments — so a fix to the window
 * or the pruning lands once.
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rate-limit:${key}`}))`
    // This key's old rows under its own lock; everyone's, now and then.
    // Pruning every key on every call made all callers contend for the same rows.
    await tx.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: since } } })
    if (Math.random() < GLOBAL_PRUNE_CHANCE) {
      await tx.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - MAX_WINDOW_MS) } } })
    }
    const recent = await tx.rateLimitHit.findMany({
      where: { key, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    })
    if (recent.length >= max) {
      const freesAt = recent[recent.length - max].createdAt.getTime() + windowMs
      return { ok: false as const, retryAfterSeconds: Math.max(1, Math.ceil((freesAt - Date.now()) / 1000)) }
    }
    await tx.rateLimitHit.create({ data: { key } })
    return { ok: true as const }
  })
}

/** rateLimit by the caller's IP (an IPv6 caller by its /64). No IP — local dev — isn't limited. */
export async function rateLimitByIp(
  action: string,
  headers: Headers,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const ip = requestIp(headers)
  if (!ip) return { ok: true }
  return rateLimit(`${action}:ip:${ipLimitKey(ip)}`, max, windowMs)
}

/** The 429 for a refused rateLimit. */
export function rateLimitedResponse(result: { retryAfterSeconds: number }, error = "Too many requests — try again later") {
  return Response.json(
    { error },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  )
}
