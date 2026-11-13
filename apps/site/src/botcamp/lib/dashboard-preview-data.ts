import "server-only"
import { prisma } from "@/botcamp/lib/prisma"
import { SPONSOR_EXCHANGE_IDS } from "@/botcamp/lib/exchanges"
import { MAX_APPLICATIONS_PER_HACKATHON } from "@/botcamp/lib/hackathon-squads"

// Read-only dashboard preview: what Botcamp's client components fetch from its
// own GET endpoints on load, read here on the server instead (this site has no
// Botcamp API) and handed to them as props.

export interface StrategyOptions {
  tags: string[]
  exchanges: string[]
}

/** GET /api/strategies/options: tags and exchanges used by non-private strategies. */
export async function getStrategyOptions(): Promise<StrategyOptions> {
  const strategies = await prisma.strategy.findMany({
    where: { visibility: { not: "PRIVATE" } },
    select: { tags: true, exchanges: true },
  })
  const tags = new Set<string>()
  const exchanges = new Set<string>(SPONSOR_EXCHANGE_IDS)
  for (const strategy of strategies) {
    strategy.tags.forEach((tag) => tags.add(tag))
    strategy.exchanges.forEach((exchange) => exchanges.add(exchange))
  }
  const byName = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())
  return { tags: [...tags].sort(byName), exchanges: [...exchanges].sort(byName) }
}

/**
 * GET /api/user/hackathon-apply-eligibility: the open hackathon this user is
 * registered for and can still apply a strategy to, if any.
 */
export async function getHackathonApplyEligibility(
  userId: string,
): Promise<{ slug: string; title: string } | null> {
  const hackathon = await prisma.hackathon.findFirst({
    where: {
      status: "REGISTRATION",
      OR: [{ registrationEnd: null }, { registrationEnd: { gte: new Date() } }],
    },
    orderBy: { startDate: "desc" },
    select: { id: true, slug: true, title: true },
  })
  if (!hackathon) return null
  const entry = await prisma.hackathonEntry.findUnique({
    where: { hackathonId_userId: { hackathonId: hackathon.id, userId } },
    select: { id: true },
  })
  if (!entry) return null
  const applicationCount = await prisma.application.count({
    where: { hackathonId: hackathon.id, userId },
  })
  if (applicationCount >= MAX_APPLICATIONS_PER_HACKATHON) return null
  return { slug: hackathon.slug, title: hackathon.title }
}
