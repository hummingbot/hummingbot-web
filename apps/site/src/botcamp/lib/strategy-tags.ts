import { prisma } from "@/botcamp/lib/prisma"
import { SPONSOR_EXCHANGE_IDS } from "@/botcamp/lib/exchanges"

// Tags/exchanges have no dedicated table — they're denormalized String[] columns
// on Strategy. "Existing" means whatever strings have already been used across
// all strategies, plus the seeded sponsor exchanges (see src/lib/exchanges.ts):
// bitget and solana have never been used by a strategy, and without the seed a
// builder trading there would have no way to say so now that the picker is a
// closed vocabulary.

export interface ExistingValues {
  tags: string[]
  exchanges: string[]
}

/**
 * Both vocabularies in a single scan of the table.
 *
 * `includePrivate` is false only for the public suggestion list, so unreviewed
 * drafts' free-typed tags aren't shown to everyone. Validation keeps private
 * strategies in scope: excluding them would strip a private strategy's own
 * tags the next time its owner saved it.
 */
export async function getExistingValues({ includePrivate = true } = {}): Promise<ExistingValues> {
  const strategies = await prisma.strategy.findMany({
    where: includePrivate ? undefined : { visibility: { not: "PRIVATE" } },
    select: { tags: true, exchanges: true },
  })

  const tags = new Set<string>()
  const exchanges = new Set<string>(SPONSOR_EXCHANGE_IDS)
  for (const strategy of strategies) {
    strategy.tags.forEach((tag) => tags.add(tag))
    strategy.exchanges.forEach((exchange) => exchanges.add(exchange))
  }

  return { tags: Array.from(tags), exchanges: Array.from(exchanges) }
}

/**
 * Matches submitted values against the existing vocabulary, case-insensitively,
 * returning them in the vocabulary's canonical casing.
 *
 * Anything unrecognized comes back in `unknown` rather than being dropped, so
 * callers can reject the request — silently discarding it would let a user
 * save and watch their tags disappear with no explanation.
 */
export function resolveToExisting(
  values: string[],
  existingValues: string[]
): { resolved: string[]; unknown: string[] } {
  const byLowerCase = new Map(existingValues.map((v) => [v.toLowerCase(), v]))
  const resolved: string[] = []
  const unknown: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const canonical = byLowerCase.get(value.trim().toLowerCase())
    if (!canonical) {
      unknown.push(value)
    } else if (!seen.has(canonical)) {
      seen.add(canonical)
      resolved.push(canonical)
    }
  }

  return { resolved, unknown }
}
