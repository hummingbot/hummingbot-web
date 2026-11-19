import { createHash, randomBytes, timingSafeEqual } from "crypto"
import { z } from "zod"
import { prisma } from "@/botcamp/lib/prisma"

/**
 * The race feed: the Condor routine that runs the finals pushes each agent's
 * cumulative P&L and volume to the site, which stores them (RaceMetric) and
 * builds the leaderboard from them (hackathon-leaderboard-data.ts).
 *
 *   GET  /api/hackathons/[slug]/race-data   the roster: which agent ids to send
 *   POST /api/hackathons/[slug]/race-data   one reading for some or all agents
 *
 * Both need `Authorization: Bearer <token>`. An admin generates the token per
 * hackathon on the Race Feed page; only its SHA-256 digest is stored
 * (Hackathon.raceFeedTokenHash), so it can't be read back, only replaced. It
 * grants nothing else on the site, and with none generated the feed answers
 * 404.
 *
 * An agent is identified by its strategy slug — stable for a hackathon entry,
 * since renaming such a strategy keeps its slug (api/user/strategies/[id]).
 * Only the agents selected for the hackathon are accepted; anything else comes
 * back in `unknown` and is recorded for the admin Race Feed page.
 */

// A reading this far ahead of the server clock is a clock or payload bug.
const MAX_FUTURE_SKEW_MS = 5 * 60_000
// More than any squad roster; bounds the work one request can ask for.
const MAX_AGENTS_PER_READING = 200

/** The stored form of a feed token: its SHA-256 digest, hex. */
export function hashRaceFeedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * A new feed token and the digest to store. 32 random bytes; the `rft_`
 * prefix makes a leaked one recognizable.
 */
export function generateRaceFeedToken(): { token: string; hash: string } {
  const token = `rft_${randomBytes(32).toString("base64url")}`
  return { token, hash: hashRaceFeedToken(token) }
}

/**
 * "disabled" (no token generated for this hackathon), "unauthorized", or
 * "ok". Compares digests in constant time.
 */
export function checkRaceFeedAuth(
  authorization: string | null,
  storedHash: string | null,
): "disabled" | "unauthorized" | "ok" {
  if (!storedHash) return "disabled"
  const [scheme, presented] = (authorization ?? "").split(" ", 2)
  if (scheme?.toLowerCase() !== "bearer" || !presented) return "unauthorized"
  const expected = Buffer.from(storedHash, "hex")
  const actual = Buffer.from(hashRaceFeedToken(presented.trim()), "hex")
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? "ok" : "unauthorized"
}

export const raceReadingSchema = z.object({
  // When the numbers were read, ISO 8601 with a timezone.
  timestamp: z.string().datetime({ offset: true }),
  agents: z
    .array(
      z.object({
        // The agent's strategy slug, as listed by GET race-data.
        agent_id: z.string().min(1).max(200),
        // Realized + unrealized P&L in quote currency, cumulative since the race started.
        pnl_quote: z.number().finite(),
        // Volume traded in quote currency, cumulative since the race started.
        volume_quote: z.number().finite().nonnegative(),
      }),
    )
    .min(1)
    .max(MAX_AGENTS_PER_READING),
})

export type RaceReading = z.infer<typeof raceReadingSchema>

/** The hackathon's selected agents, keyed by strategy slug. */
export async function getRaceRosterBySlug(hackathonId: string, teamIds: string[]) {
  const applications = await prisma.application.findMany({
    where: { hackathonId, selectedTeamId: { in: teamIds }, strategy: { isNot: null } },
    select: {
      id: true,
      user: { select: { name: true, firstName: true, lastName: true } },
      strategy: { select: { slug: true, title: true } },
      selectedTeam: { select: { slug: true, name: true, sortOrder: true } },
    },
    orderBy: [{ selectedTeam: { sortOrder: "asc" } }, { createdAt: "asc" }, { id: "asc" }],
  })
  return applications.map((app) => ({
    applicationId: app.id,
    agentId: app.strategy!.slug,
    strategyTitle: app.strategy!.title,
    team: { slug: app.selectedTeam!.slug, name: app.selectedTeam!.name },
    driver: `${app.user.firstName ?? ""} ${app.user.lastName ?? ""}`.trim() || app.user.name || "Agent Driver",
  }))
}

export type RaceFeedResult =
  | { ok: true; accepted: number; unknown: string[] }
  | { ok: false; status: 400; error: string }

/**
 * Store one reading. Known agents are upserted on (agent, timestamp), so a
 * retried POST is harmless; unknown ids are returned and recorded, never
 * stored as metrics.
 */
export async function ingestRaceReading(
  hackathon: { id: string; teamIds: string[] },
  reading: RaceReading,
  now: Date = new Date(),
): Promise<RaceFeedResult> {
  const timestamp = new Date(reading.timestamp)
  if (timestamp.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) {
    return { ok: false, status: 400, error: "timestamp is in the future" }
  }
  const ids = reading.agents.map((a) => a.agent_id)
  if (new Set(ids).size !== ids.length) {
    return { ok: false, status: 400, error: "each agent_id may appear once per reading" }
  }

  const roster = await getRaceRosterBySlug(hackathon.id, hackathon.teamIds)
  const applicationBySlug = new Map(roster.map((r) => [r.agentId, r.applicationId]))
  const known = reading.agents.filter((a) => applicationBySlug.has(a.agent_id))
  const unknown = reading.agents.filter((a) => !applicationBySlug.has(a.agent_id)).map((a) => a.agent_id)

  await prisma.$transaction([
    ...known.map((a) => {
      const applicationId = applicationBySlug.get(a.agent_id)!
      const values = { pnlQuote: a.pnl_quote, volumeQuote: a.volume_quote }
      return prisma.raceMetric.upsert({
        where: { applicationId_timestamp: { applicationId, timestamp } },
        create: { hackathonId: hackathon.id, applicationId, timestamp, ...values },
        update: values,
      })
    }),
    prisma.raceFeedReceipt.create({
      data: { hackathonId: hackathon.id, timestamp, accepted: known.length, unknownIds: unknown },
    }),
  ])

  return { ok: true, accepted: known.length, unknown }
}
