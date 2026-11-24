import { prisma } from "@/botcamp/lib/prisma"
import { summarizeApplicationScores } from "@/botcamp/lib/admin-application"
import type { AdminApplicationRow } from "@/botcamp/components/admin/AdminApplicationsTable"

export function displayName(user: {
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string
}): string {
  if (user.name) return user.name
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return user.email
}

export interface RosterSeat {
  applicationId: string
  name: string
  avatarUrl: string | null
  slug: string | null
  strategyId: number | null
  strategyTitle: string | null
  strategySlug: string | null
  wallets: { chain: string; address: string }[]
}

export interface TeamBreakdownRow {
  id: string
  name: string
  preferenceCount: number
  applicantNames: string[]
  selectedCount: number
  maxSelections: number
  selectedApplicantNames: string[]
  roster: RosterSeat[]
}

// Shared by the main dashboard's featured-hackathon card and the per-hackathon
// Applications page (reached from History), so any hackathon — current or
// past — gets the same applications table / final-rosters treatment.
//
// Also derives the team breakdown and needs-review count from the same
// application rows rather than issuing separate aggregate queries.
export async function getHackathonDashboardData(
  hackathonId: string,
  teamIds: string[],
  maxSelections: number,
) {
  const [applications, teams] = await Promise.all([
    prisma.application.findMany({
      where: { hackathonId },
      select: {
        id: true,
        userId: true,
        status: true,
        teamPreferences: true,
        createdAt: true,
        user: {
          select: { name: true, firstName: true, lastName: true, email: true, avatarUrl: true, slug: true },
        },
        strategy: {
          select: { id: true, slug: true, title: true, status: true, strategyType: true },
        },
        selectedTeam: { select: { id: true, name: true } },
        scores: {
          select: {
            adminId: true,
            score: true,
            admin: { select: { name: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } }),
  ])

  const teamNameById = new Map(teams.map((t) => [t.id, t.name]))

  // Wallets live on HackathonEntry (registration), not Application — join by
  // the (hackathonId, userId) pair each applicant's entry is unique on.
  const entries = await prisma.hackathonEntry.findMany({
    where: { hackathonId, userId: { in: applications.map((a) => a.userId) } },
    select: { userId: true, walletAddresses: true },
  })
  const walletsByUserId = new Map(
    entries.map((e) => [e.userId, (e.walletAddresses as { chain: string; address: string }[] | null) ?? []])
  )

  const rows: AdminApplicationRow[] = applications.map((app) => {
    const scoreSummary = summarizeApplicationScores(app.scores)
    return {
      id: app.id,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      user: app.user,
      strategy: app.strategy,
      teamPreferenceNames: app.teamPreferences.map((teamId) => teamNameById.get(teamId) || "Unknown team"),
      selectedTeamName: app.selectedTeam?.name ?? null,
      avgScore: scoreSummary.average,
      scoreCount: scoreSummary.count,
      scorers: scoreSummary.entries,
      wallets: walletsByUserId.get(app.userId) ?? [],
    }
  })

  // Ranked-but-not-finalized (DRAFT) applications don't reflect real intent yet.
  const ranked = applications.filter((app) => app.status !== "DRAFT")
  const teamBreakdown: TeamBreakdownRow[] = teams.map((team) => {
    const applicants = ranked.filter((app) => app.teamPreferences.includes(team.id))
    const selectedApplications = applications.filter((app) => app.selectedTeam?.id === team.id)
    return {
      id: team.id,
      name: team.name,
      preferenceCount: applicants.length,
      applicantNames: applicants.map((app) => displayName(app.user)),
      selectedCount: selectedApplications.length,
      maxSelections,
      selectedApplicantNames: selectedApplications.map((app) => displayName(app.user)),
      roster: selectedApplications.map(
        (app): RosterSeat => ({
          applicationId: app.id,
          name: displayName(app.user),
          avatarUrl: app.user.avatarUrl,
          slug: app.user.slug,
          strategyId: app.strategy?.id ?? null,
          strategyTitle: app.strategy?.title ?? null,
          strategySlug: app.strategy?.slug ?? null,
          wallets: walletsByUserId.get(app.userId) ?? [],
        }),
      ),
    }
  })

  // Every team has filled its squad — the dashboard's job shifts from
  // reviewing applications to showing the confirmed rosters.
  const allSeatsFull = teamBreakdown.length > 0 && teamBreakdown.every((t) => t.selectedCount >= t.maxSelections)

  return {
    rows,
    teamBreakdown,
    allSeatsFull,
    selectedCount: applications.filter((app) => app.selectedTeam).length,
    needsReviewCount: applications.filter((app) => app.status === "FINALIZED").length,
  }
}

export interface HackathonWinner {
  applicationId: string
  rank: number
  prizeAmount: string | null
  prizeNote: string | null
  userName: string
  strategyTitle: string | null
}

export interface HackathonStats {
  registrantsCount: number
  strategiesCreatedCount: number
  applicationsSubmittedCount: number
  rankedTeamsCount: number
  certifiedStrategiesCount: number
  avgAdminScore: number | null
  scoredApplicationsCount: number
  distinctScoringAdmins: number
  durationDays: number
  winners: HackathonWinner[]
  finalViewers: number | null
}

// Post-mortem numbers for a hackathon that's run its course — meant to guide
// planning the next one (conversion through the funnel, capacity used,
// review engagement). `finalViewers` is the one field we can't derive from
// this database (no stream/analytics integration) so it's filled in by hand
// on the hackathon edit form.
export async function getHackathonStats(hackathonId: string): Promise<HackathonStats> {
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: {
      startDate: true,
      endDate: true,
      finalViewers: true,
    },
  })
  if (!hackathon) {
    throw new Error("Hackathon not found")
  }

  const [entries, applications, certifiedStrategiesCount] = await Promise.all([
    prisma.hackathonEntry.findMany({ where: { hackathonId }, select: { userId: true } }),
    prisma.application.findMany({
      where: { hackathonId },
      select: {
        id: true,
        status: true,
        teamPreferences: true,
        rank: true,
        prizeAmount: true,
        prizeNote: true,
        user: { select: { name: true, firstName: true, lastName: true, email: true } },
        strategy: { select: { title: true } },
        scores: { select: { adminId: true, score: true } },
      },
    }),
    // "Created a strategy" for the funnel means an actual authored Strategy,
    // not just an Application with a strategyId — see getRegistrantFunnel.
    prisma.strategy.count({
      where: { status: "CERTIFIED", applications: { some: { hackathonId } } },
    }),
  ])

  const registrantUserIds = entries.map((e) => e.userId)
  const strategyAuthors = registrantUserIds.length
    ? await prisma.strategyAuthor.findMany({
        where: { userId: { in: registrantUserIds } },
        select: { userId: true },
        distinct: ["userId"],
      })
    : []

  const allScores = applications.flatMap((a) => a.scores)
  const avgAdminScore =
    allScores.length > 0
      ? Math.round((allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length) * 10) / 10
      : null

  const winners: HackathonWinner[] = applications
    .filter((a): a is typeof a & { rank: number } => a.rank != null)
    .sort((a, b) => a.rank - b.rank)
    .map((a) => ({
      applicationId: a.id,
      rank: a.rank,
      prizeAmount: a.prizeAmount,
      prizeNote: a.prizeNote,
      userName: displayName(a.user),
      strategyTitle: a.strategy?.title ?? null,
    }))

  return {
    registrantsCount: entries.length,
    strategiesCreatedCount: strategyAuthors.length,
    applicationsSubmittedCount: applications.filter(
      (a) => a.status === "FINALIZED" || a.status === "REVIEWED"
    ).length,
    rankedTeamsCount: applications.filter((a) => a.teamPreferences.length > 0).length,
    certifiedStrategiesCount,
    avgAdminScore,
    scoredApplicationsCount: applications.filter((a) => a.scores.length > 0).length,
    distinctScoringAdmins: new Set(allScores.map((s) => s.adminId)).size,
    durationDays: Math.max(
      1,
      Math.round((hackathon.endDate.getTime() - hackathon.startDate.getTime()) / (1000 * 60 * 60 * 24))
    ),
    winners,
    finalViewers: hackathon.finalViewers,
  }
}

export interface FinalRosterTeam {
  id: string
  name: string
  logoUrl: string | null
  logoUrlDark: string | null
  slug: string | null
  selectedCount: number
  maxSelections: number
  roster: RosterSeat[]
}

// Joins the team breakdown (scoped to one hackathon) with branding fields
// from the wider team list — `getHackathonDashboardData` only queries
// {id, name} for its teams since that's all the breakdown math needs.
export function buildFinalRosterTeams(
  teamBreakdown: TeamBreakdownRow[],
  teamBrandingById: Map<string, { logoUrl: string | null; logoUrlDark: string | null; slug: string | null }>
): FinalRosterTeam[] {
  return teamBreakdown.map((t) => ({
    id: t.id,
    name: t.name,
    logoUrl: teamBrandingById.get(t.id)?.logoUrl ?? null,
    logoUrlDark: teamBrandingById.get(t.id)?.logoUrlDark ?? null,
    slug: teamBrandingById.get(t.id)?.slug ?? null,
    selectedCount: t.selectedCount,
    maxSelections: t.maxSelections,
    roster: t.roster,
  }))
}
