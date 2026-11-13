import { prisma } from "@/botcamp/lib/prisma"
import { resolveBotcampImageUrl } from "@/botcamp/lib/botcamp-assets"
import type { TeamSponsorCard, AgentSeat } from "@/botcamp/components/hackathons/TeamSponsorsGrid"
import type { ShowcaseBuilder } from "@/botcamp/components/hackathons/BuilderShowcaseCard"

/**
 * Whether a user is registered for at least one hackathon. Hackathon
 * applicants aren't cohort members, but they still need to be able to
 * create an Agent/Controller strategy so they can apply to a team.
 */
export async function hasHackathonEntry(userId: string): Promise<boolean> {
  const count = await prisma.hackathonEntry.count({ where: { userId } })
  return count > 0
}

/**
 * Registered builders for a hackathon, shaped for the showcase cards.
 * `total` is the full count; `builders` may be capped via `take`.
 */
export async function getRegisteredBuilders(
  hackathonId: string,
  opts: { excludeUserId?: string; take?: number; currentUserId?: string } = {},
): Promise<{ builders: ShowcaseBuilder[]; total: number }> {
  const where = {
    hackathonId,
    ...(opts.excludeUserId ? { userId: { not: opts.excludeUserId } } : {}),
  }
  const [entries, total] = await Promise.all([
    prisma.hackathonEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(opts.take ? { take: opts.take } : {}),
      select: {
        id: true,
        userId: true,
        strategyDescription: true,
        sponsorTeam: { select: { name: true, logoUrl: true, logoUrlDark: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            tagline: true,
            avatarUrl: true,
            location: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    }),
    prisma.hackathonEntry.count({ where }),
  ])
  const builders: ShowcaseBuilder[] = entries.map((e) => ({
    id: e.id,
    name: [e.user.firstName, e.user.lastName].filter(Boolean).join(" ").trim() || "Anonymous Builder",
    tagline: e.user.tagline,
    avatarUrl: e.user.avatarUrl,
    strategyDescription: e.strategyDescription,
    location: e.user.location,
    latitude: e.user.latitude,
    longitude: e.user.longitude,
    sponsor: e.sponsorTeam ?? null,
    isYou: !!opts.currentUserId && e.userId === opts.currentUserId,
  }))
  return { builders, total }
}

type SeatUser =
  | { firstName: string | null; lastName: string | null; name: string | null }
  | null
  | undefined

function composeName(user: SeatUser, fallback: string): string {
  if (!user) return fallback
  const composed = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
  return composed || user.name || fallback
}

/**
 * Resolves the F1-style team roster for a hackathon: each team's agent
 * seats are the applications it selected, padded with nulls to
 * `slotsPerSquad` (the hackathon's `maxSelections`). Every page that shows
 * seats goes through here, so the rosters always agree.
 */
export async function getHackathonSquads(
  hackathonId: string,
  teamIds: string[],
  slotsPerSquad: number,
): Promise<Array<TeamSponsorCard & { description: string | null }>> {
  if (teamIds.length === 0) return []

  const [teamsData, selectedApps] = await Promise.all([
    prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        logoUrlDark: true,
        primaryColor: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    // Stable seat order (selection seniority, then id) — the same order the
    // leaderboard roster uses, so racing numbers match and never swap.
    prisma.application.findMany({
      where: { hackathonId, selectedTeamId: { in: teamIds } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        selectedTeamId: true,
        user: { select: { firstName: true, lastName: true, name: true, avatarUrl: true } },
        strategy: { select: { slug: true, title: true } },
      },
    }),
  ])
  const selectedByTeam = new Map<string, typeof selectedApps>()
  for (const app of selectedApps) {
    if (!app.selectedTeamId) continue
    const list = selectedByTeam.get(app.selectedTeamId) ?? []
    list.push(app)
    selectedByTeam.set(app.selectedTeamId, list)
  }

  return Promise.all(teamsData.map(async (t) => {
    const agents: (AgentSeat | null)[] = []
    for (const app of selectedByTeam.get(t.id) ?? []) {
      if (agents.length >= slotsPerSquad) break
      agents.push({
        name: composeName(app.user, "Agent Driver"),
        avatarURL: app.user.avatarUrl ?? null,
        strategy: app.strategy,
      })
    }
    while (agents.length < slotsPerSquad) agents.push(null)
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      logoUrl: await resolveBotcampImageUrl(t.logoUrl),
      logoUrlDark: await resolveBotcampImageUrl(t.logoUrlDark),
      primaryColor: t.primaryColor,
      agents,
    }
  }))
}
