import type { Prisma, Strategy } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { ipLimitKey } from "@/botcamp/lib/request-ip"
import { generateUniqueSlug } from "@/botcamp/lib/slug"
import { MAX_DRAFTS_PER_USER, MAX_STRATEGIES_PER_USER, unfinishedDraftsWhere } from "@/botcamp/lib/strategy-limits"

// Creating a strategy is capped over a rolling day, per person and per IP,
// counting every create — a strategy deleted afterwards still counts, so a
// create/delete loop can't get around the caps. Generous on purpose: the
// busiest day on prod (2026-08-31) saw 12 creates across every user, and a
// hackathon venue puts many builders behind one IP.
export const MAX_CREATES_PER_USER_PER_DAY = 5
export const MAX_CREATES_PER_IP_PER_DAY = 20
const CREATE_WINDOW_MS = 24 * 60 * 60 * 1000

type Db = Prisma.TransactionClient | typeof prisma

// 403 for the strategy and draft caps, 429 (with Retry-After) for the daily
// quota. Not 409: Condor's hub contract reserves that for a resubmission with
// changed bytes (condor docs/botcamp-agent-hub-contract.md).
export type StrategyCreateRefusal = {
  error: string
  status: 403 | 429
  retryAfterSeconds?: number
}

/**
 * Why `userId` can't start another strategy right now — the overall cap, or an
 * unfinished draft (admins aren't held to the draft cap) — or null. Pages use
 * it to explain why there's no Create button; createStrategy checks it again
 * under its lock.
 */
export async function strategyCapRefusal(userId: string, role: string, db: Db = prisma): Promise<StrategyCreateRefusal | null> {
  if ((await db.strategyAuthor.count({ where: { userId } })) >= MAX_STRATEGIES_PER_USER) {
    return { error: `You can only have up to ${MAX_STRATEGIES_PER_USER} strategies`, status: 403 }
  }
  if (role !== "ADMIN") {
    const drafts = await db.strategy.findMany({
      where: unfinishedDraftsWhere(userId),
      select: { title: true },
      orderBy: { createdAt: "asc" },
      take: MAX_DRAFTS_PER_USER,
    })
    if (drafts.length >= MAX_DRAFTS_PER_USER) {
      return { error: `Finish or delete your draft "${drafts[0].title}" before starting another strategy`, status: 403 }
    }
  }
  return null
}

async function quotaRefusal(db: Db, where: Prisma.StrategyCreationWhereInput, max: number, since: Date): Promise<StrategyCreateRefusal | null> {
  const recent = await db.strategyCreation.findMany({
    where: { ...where, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  if (recent.length < max) return null
  const freesAt = recent[recent.length - max].createdAt.getTime() + CREATE_WINDOW_MS
  const retryAfterSeconds = Math.max(1, Math.ceil((freesAt - Date.now()) / 1000))
  return {
    error: `Too many strategies created recently — try again after ${new Date(freesAt).toISOString().slice(11, 16)} UTC`,
    status: 429,
    retryAfterSeconds,
  }
}

/**
 * Creates a strategy with `userId` as its author, under every create cap: the
 * overall and draft caps, and (for everyone but admins) the daily quota per
 * person and per IP. The checks and the insert share one transaction under
 * per-person and per-IP locks, so parallel requests can't all get under a cap.
 * IPv6 callers are counted by their /64.
 */
export async function createStrategy({
  userId,
  role,
  ip,
  title,
  data,
}: {
  userId: string
  role: string
  ip: string | null
  title: string
  data: Omit<Prisma.StrategyCreateInput, "title" | "slug" | "authors">
}): Promise<{ strategy: Strategy } | { refusal: StrategyCreateRefusal }> {
  const ipKey = ip ? ipLimitKey(ip) : null
  // The slug is picked outside the transaction: a unique-slug clash aborts the
  // whole Postgres transaction, so each retry starts a fresh one.
  for (let attempt = 0; ; attempt++) {
    const slug = await generateUniqueSlug(title, "strategy", undefined, userId)
    try {
      return await prisma.$transaction(async (tx) => {
        // Always person first, then IP, so two requests never wait on each other's lock.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`strategy-create:user:${userId}`}))`
        if (ipKey) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`strategy-create:ip:${ipKey}`}))`

        const since = new Date(Date.now() - CREATE_WINDOW_MS)
        await tx.strategyCreation.deleteMany({ where: { createdAt: { lt: since } } })

        const refusal =
          (await strategyCapRefusal(userId, role, tx)) ??
          (role === "ADMIN"
            ? null
            : ((await quotaRefusal(tx, { userId }, MAX_CREATES_PER_USER_PER_DAY, since)) ??
              (ipKey ? await quotaRefusal(tx, { ip: ipKey }, MAX_CREATES_PER_IP_PER_DAY, since) : null)))
        if (refusal) return { refusal }

        const strategy = await tx.strategy.create({
          data: { ...data, title, slug, authors: { create: { userId } } },
        })
        await tx.strategyCreation.create({ data: { userId, ip: ipKey } })
        return { strategy }
      })
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002" && attempt < 2) continue
      throw err
    }
  }
}
