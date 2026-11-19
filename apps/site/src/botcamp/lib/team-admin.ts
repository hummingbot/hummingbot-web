import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { summarizeScoresForSponsor } from "@/botcamp/lib/admin-application"

// Data behind the sponsor-team administration view. Shared by the team's own
// dashboard (/dashboard/team) and the admin's copy of it (/admin/teams/[id]),
// so an admin managing a team sees exactly what that team's admins see.

/** Team fields the administration view needs — never the logo Bytes columns. */
export const teamAdminSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  logoUrl: true,
  logoUrlDark: true,
  websiteUrl: true,
  rules: true,
  resources: true,
  primaryColor: true,
  sortOrder: true,
  members: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, slug: true },
      },
    },
  },
}

/** Prefer a live hackathon this team sponsors, else the latest non-draft one. */
export async function getRelevantHackathonForTeam(teamId: string) {
  const live = await prisma.hackathon.findFirst({
    where: { teamIds: { has: teamId }, status: { in: CURRENT_HACKATHON_STATUSES } },
    orderBy: { startDate: "desc" },
  })
  if (live) return live

  return prisma.hackathon.findFirst({
    where: { teamIds: { has: teamId }, status: { not: "DRAFT" } },
    orderBy: { startDate: "desc" },
  })
}

/**
 * Whether a sponsor team may review an application: it ranked the team and
 * has been submitted, or the team already selected it. A DRAFT is still the
 * builder's work in progress — no team sees it (or its code) before they
 * finalize. The same rule as canTeamReviewStrategy, for one team.
 */
export function teamCanReviewApplication(
  application: { status: string; teamPreferences: string[]; selectedTeamId: string | null },
  teamId: string,
): boolean {
  if (application.selectedTeamId === teamId) return true
  return application.status !== "DRAFT" && application.teamPreferences.includes(teamId)
}

/** teamCanReviewApplication as a Prisma filter, for listings. */
export function teamReviewableApplicationsWhere(teamId: string) {
  return {
    OR: [
      { selectedTeamId: teamId },
      { status: { not: "DRAFT" as const }, teamPreferences: { has: teamId } },
    ],
  }
}

export async function getTeamApplicants(teamId: string, hackathonId: string) {
  const applications = await prisma.application.findMany({
    where: {
      hackathonId,
      status: { not: "DRAFT" },
      teamPreferences: { has: teamId },
    },
    include: {
      user: {
        select: { id: true, name: true, firstName: true, lastName: true, avatarUrl: true, slug: true },
      },
      strategy: {
        select: { id: true, title: true, slug: true, strategyType: true, updatedAt: true },
      },
      scores: {
        select: { score: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return applications.map((app) => ({
    id: app.id,
    status: app.status,
    teamPreferences: app.teamPreferences,
    preferenceRank: app.teamPreferences.indexOf(teamId) + 1,
    isSelectedByThisTeam: app.selectedTeamId === teamId,
    scoreSummary: summarizeScoresForSponsor(app.scores),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    user: app.user,
    strategy: app.strategy
      ? { ...app.strategy, updatedAt: app.strategy.updatedAt.toISOString() }
      : null,
  }))
}

export async function getTeamStats(
  teamId: string,
  hackathon: { id: string; maxSelections: number },
) {
  const { id: hackathonId, maxSelections } = hackathon
  const [registrantsCount, applicantsCount, selectedCount] = await Promise.all([
    prisma.hackathonEntry.count({ where: { sponsorTeamId: teamId, hackathonId } }),
    prisma.application.count({
      where: { hackathonId, status: { not: "DRAFT" }, teamPreferences: { has: teamId } },
    }),
    prisma.application.count({ where: { hackathonId, selectedTeamId: teamId } }),
  ])

  return {
    registrantsCount,
    applicantsCount,
    selectedCount,
    maxSelections,
  }
}

export async function getPreStartRegistrants(teamId: string, hackathonId: string) {
  const entries = await prisma.hackathonEntry.findMany({
    where: { sponsorTeamId: teamId, hackathonId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          location: true,
          latitude: true,
          longitude: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return entries.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    user: entry.user,
  }))
}

const TEXT_EXTENSIONS = [
  ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml", ".txt", ".md",
  ".csv", ".xml", ".html", ".css", ".sh", ".bash", ".toml", ".ini", ".conf", ".config",
]

function isTextFile(mimeType: string | null, filename: string): boolean {
  if (mimeType && (mimeType.startsWith("text/") || mimeType.includes("json") || mimeType.includes("yaml"))) {
    return true
  }
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  return TEXT_EXTENSIONS.includes(ext)
}

/**
 * Everything ApplicationReviewer needs to review one application on behalf of
 * a team. Returns null unless the team may review it (teamCanReviewApplication):
 * submitted and ranking this team, or already selected by it.
 */
export async function getTeamApplicationReview(applicationId: string, teamId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          slug: true,
          github: true,
          linkedin: true,
        },
      },
      strategy: {
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          details: true,
          tags: true,
          strategyType: true,
          exchanges: true,
          videoURL: true,
          updatedAt: true,
          files: {
            select: {
              id: true,
              filename: true,
              type: true,
              mimeType: true,
              size: true,
              url: true,
              content: true,
            },
          },
          // Resource images stream from /api/strategies/[slug]/images/[id],
          // which lets a sponsor reviewer through via canTeamReviewStrategy.
          images: {
            select: { id: true, filename: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      hackathon: {
        select: { id: true, slug: true, status: true, maxSelections: true },
      },
      scores: {
        select: { score: true },
      },
      // Only this team's own note — every ranked team reviews the same
      // application and none may read another's.
      teamNotes: {
        where: { teamId },
        select: { note: true },
      },
    },
  })

  if (!application || !teamCanReviewApplication(application, teamId)) {
    return null
  }

  const selectedCount = await prisma.application.count({
    where: { hackathonId: application.hackathonId, selectedTeamId: teamId },
  })

  const strategy = application.strategy
    ? {
        id: application.strategy.id,
        title: application.strategy.title,
        slug: application.strategy.slug,
        summary: application.strategy.summary,
        details: application.strategy.details,
        tags: application.strategy.tags,
        strategyType: application.strategy.strategyType,
        exchanges: application.strategy.exchanges,
        videoURL: application.strategy.videoURL,
        updatedAt: application.strategy.updatedAt.toISOString(),
        files: application.strategy.files.map((f) =>
          f.type === "LINK"
            ? { id: f.id, filename: f.filename, type: "LINK" as const, url: f.url }
            : {
                id: f.id,
                filename: f.filename,
                type: "FILE" as const,
                mimeType: f.mimeType,
                size: f.size,
                content:
                  f.content && isTextFile(f.mimeType, f.filename)
                    ? Buffer.from(f.content).toString("utf-8")
                    : null,
              }
        ),
        images: application.strategy.images,
      }
    : null

  return {
    application: {
      id: application.id,
      status: application.status,
      teamNote: application.teamNotes[0]?.note ?? null,
      adminNote: application.adminNote,
      scoreSummary: summarizeScoresForSponsor(application.scores),
      teamPreferences: application.teamPreferences,
      preferenceRank: application.teamPreferences.indexOf(teamId) + 1,
      isSelectedByThisTeam: application.selectedTeamId === teamId,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    },
    user: application.user,
    strategy,
    hackathonSlug: application.hackathon.slug,
    hackathonStatus: application.hackathon.status,
    selectedCount,
    maxSelections: application.hackathon.maxSelections,
  }
}
