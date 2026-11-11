import { prisma } from "@/botcamp/lib/prisma"
import { MAX_DRAFTS_PER_USER, MAX_STRATEGIES_PER_USER, unfinishedDraftsWhere } from "@/botcamp/lib/strategy-limits"

// The read-only part of Botcamp's strategy-create.ts, for the dashboard
// preview: why a person can't start another strategy. createStrategy (a write)
// and its daily quotas are left out.

// Creating a strategy is capped over a rolling day, per person and per IP,
// counting every create — a strategy deleted afterwards still counts, so a
// create/delete loop can't get around the caps. Generous on purpose: the
// busiest day on prod (2026-08-31) saw 12 creates across every user, and a
// hackathon venue puts many builders behind one IP.
export const MAX_CREATES_PER_USER_PER_DAY = 5
export const MAX_CREATES_PER_IP_PER_DAY = 20

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
 * it to explain why there's no Create button; Botcamp's createStrategy
 * checks it again under its lock.
 */
export async function strategyCapRefusal(userId: string, role: string): Promise<StrategyCreateRefusal | null> {
  if ((await prisma.strategyAuthor.count({ where: { userId } })) >= MAX_STRATEGIES_PER_USER) {
    return { error: `You can only have up to ${MAX_STRATEGIES_PER_USER} strategies`, status: 403 }
  }
  if (role !== "ADMIN") {
    const drafts = await prisma.strategy.findMany({
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
