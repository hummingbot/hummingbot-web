import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { PUBLISHED_STRATEGY_WHERE, getFreePreviewStrategyIds, notRacingWhere } from "@/botcamp/lib/strategy-access"
import { getStrategyShowcase } from "@/botcamp/lib/strategy-showcase"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import StrategiesClient from "@/botcamp/app/strategies/StrategiesClient"

// Dynamic so the client child's useSearchParams() doesn't hit Next.js's
// static-prerender path without a Suspense boundary. (The previous auth()
// call made this implicit; removing it broke the build.)
export const dynamic = "force-dynamic"

const STRATEGIES_DESCRIPTION =
  "Trading agents and strategies built by Botcamp members. Clone the Condor Ready agents into Condor and run them on your own account."

export const metadata = {
  title: "Strategies",
  description: STRATEGIES_DESCRIPTION,
  openGraph: {
    type: "website",
    title: "Strategies",
    description: STRATEGIES_DESCRIPTION,
    url: "/hub",
  },
  twitter: {
    card: "summary_large_image",
    title: "Strategies",
    description: STRATEGIES_DESCRIPTION,
  },
}

async function getStrategies() {
  // Listing shows published strategies regardless of visibility — PRIVATE
  // strategies appear with their metadata, but Code/Resources tabs are
  // gated to author+admin on the detail page. The MEMBERS_ONLY tier was
  // collapsed away; the enum value is retained in the schema for backward
  // compat but no longer drives behavior.
  // Drafts and strategies still in review aren't listed: their pages 404
  // for everyone but their authors (PUBLISHED_STRATEGY_WHERE).
  const strategies = await prisma.strategy.findMany({
    where: {
      AND: [
        PUBLISHED_STRATEGY_WHERE,
        // Agents from the open registry upload are listed once a version passes
        // review (see Strategy.agentApprovalRequired).
        { OR: [{ agentApprovalRequired: false }, { agentVersions: { some: { status: "APPROVED" } } }] },
        // Agents are listed once they raced (a team picked them for its squad)
        // or are Condor Ready: an approved version on a page that isn't
        // private — the same rule as the carousel and Condor's catalogue.
        // Other agents stay reachable by link.
        {
          OR: [
            { strategyType: { not: "AGENT" } },
            { applications: { some: { selectedTeamId: { not: null } } } },
            { visibility: { not: "PRIVATE" }, agentVersions: { some: { status: "APPROVED" } } },
          ],
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      tags: true,
      exchanges: true,
      summary: true,
      videoURL: true,
      status: true,
      visibility: true,
      strategyType: true,
      featured: true,
      createdAt: true,
      updatedAt: true,
      cohortRelation: {
        select: {
          number: true,
        },
      },
      // Hackathon association — only submitted applications count (drafts stay
      // hidden; withdrawing an application de-lists the strategy).
      applications: {
        where: { status: { in: ["FINALIZED", "REVIEWED"] } },
        select: {
          hackathon: {
            select: { slug: true, title: true },
          },
        },
        take: 1,
      },
      // Any APPROVED agent version makes a non-private Agent clonable from
      // Condor — the same rule as the catalogue at GET /api/agents.
      agentVersions: {
        where: { status: "APPROVED" },
        select: { id: true },
        take: 1,
      },
      _count: {
        select: {
          files: true,
        },
      },
      authors: {
        select: {
          user: {
            select: {
              id: true,
              slug: true,
              name: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              profileVisibility: true,
            },
          },
        },
      },
    },
    orderBy: {
      cohortRelation: {
        number: 'desc',
      },
    },
  })

  // Transform the data
  return strategies.map((strategy) => ({
    id: strategy.id,
    slug: strategy.slug,
    title: strategy.title,
    tags: strategy.tags,
    exchanges: strategy.exchanges,
    summary: strategy.summary,
    // null when the strategy isn't tied to a cohort. 0 is reserved for the
    // seeded Example cohort. The "Certified" filter runs on `status`, not this.
    cohort: strategy.cohortRelation?.number ?? null,
    // null when the strategy has no submitted hackathon application.
    hackathon: strategy.applications[0]?.hackathon ?? null,
    status: strategy.status,
    hasFiles: strategy._count.files > 0,
    fileCount: strategy._count.files,
    videoURL: strategy.videoURL,
    visibility: strategy.visibility,
    strategyType: strategy.strategyType,
    featured: strategy.featured,
    condorReady:
      strategy.strategyType === "AGENT" &&
      strategy.visibility !== "PRIVATE" &&
      strategy.agentVersions.length > 0,
    createdAt: strategy.createdAt.toISOString(),
    updatedAt: strategy.updatedAt.toISOString(),
    students: strategy.authors.map((sa) => ({
      id: sa.user.id,
      slug: sa.user.slug || sa.user.id,
      name: sa.user.name || `${sa.user.firstName || ""} ${sa.user.lastName || ""}`.trim() || "Anonymous",
      avatarURL: sa.user.avatarUrl,
      profilePublic: sa.user.profileVisibility === "PUBLIC",
    })),
  }))
}

// Agents Condor can clone — the same rule as the catalogue at GET /api/agents:
// an APPROVED version, a page that isn't PRIVATE, not racing. Unlike the list below,
// it doesn't ask that the agent raced; an admin approved every one of them.
async function getCondorReadyAgents() {
  // Botcamp advances due hackathon stages here first (a database write);
  // this site only reads, so it uses the stage Botcamp last saved.
  const agents = await prisma.strategy.findMany({
    where: {
      strategyType: "AGENT",
      visibility: { not: "PRIVATE" },
      agentVersions: { some: { status: "APPROVED" } },
      // A racing agent can't be cloned until its race ends
      ...notRacingWhere(),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      tags: true,
      exchanges: true,
      videoURL: true,
      featured: true,
      agentVersions: {
        where: { status: "APPROVED" },
        orderBy: { version: "desc" },
        select: { version: true, reviewedAt: true, createdAt: true },
        take: 1,
      },
      authors: {
        select: {
          user: {
            select: { id: true, slug: true, name: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      },
    },
  })

  return agents.map((agent) => {
    const latest = agent.agentVersions[0]
    return {
      id: agent.id,
      slug: agent.slug,
      title: agent.title,
      summary: agent.summary,
      tags: agent.tags,
      exchanges: agent.exchanges,
      videoURL: agent.videoURL,
      featured: agent.featured,
      version: latest.version,
      approvedAt: (latest.reviewedAt ?? latest.createdAt).toISOString(),
      authors: agent.authors.map(({ user }) => ({
        slug: user.slug || user.id,
        name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous",
        avatarURL: user.avatarUrl,
      })),
    }
  })
}

async function getCohorts() {
  const cohorts = await prisma.cohort.findMany({
    orderBy: { number: "desc" },
    select: {
      number: true,
      status: true,
      startDate: true,
      endDate: true,
      description: true,
      registrationUrl: true,
    },
  })

  return cohorts.map((cohort) => ({
    number: cohort.number,
    status: cohort.status.toLowerCase(),
    startDate: cohort.startDate.toISOString(),
    endDate: cohort.endDate.toISOString(),
    description: cohort.description || "",
    registrationUrl: cohort.registrationUrl || undefined,
  }))
}

// Current hackathon for the sidebar CTA. Mirrors /hackathons: prefer a live
// (REGISTRATION/ACTIVE) one, and return null when there is none so the CTA
// hides rather than linking somewhere stale.
async function getCurrentHackathon() {
  const hackathon = await prisma.hackathon.findFirst({
    where: { status: { in: CURRENT_HACKATHON_STATUSES } },
    orderBy: { startDate: "desc" },
    select: {
      slug: true,
      title: true,
      status: true,
      registrationEnd: true,
    },
  })

  if (!hackathon) return null

  return {
    slug: hackathon.slug,
    title: hackathon.title,
    status: hackathon.status,
    registrationEnd: hackathon.registrationEnd?.toISOString() ?? null,
  }
}

// Botcamp reads the session here (membership or an unlock for access, and
// whether anyone is signed in). This site has no sign-in, so the viewer is
// always signed out: no access, and no free previews without an account.
async function getHasStrategyAccess() {
  return false
}

async function getIsSignedIn() {
  return false
}

export default async function StrategiesPage() {
  const [strategies, condorAgents, cohorts, hackathon, hasAccess, freePreviewIds, isSignedIn, showcase] =
    await Promise.all([
      getStrategies(),
      getCondorReadyAgents(),
      getCohorts(),
      getCurrentHackathon(),
      getHasStrategyAccess(),
      getFreePreviewStrategyIds(),
      getIsSignedIn(),
      getStrategyShowcase(),
    ])

  // Race winners lead, then hand-picked agents, then the newest approvals.
  const condorReady = condorAgents
    .map((agent) => ({
      ...agent,
      free: freePreviewIds.has(agent.id),
      showcase: showcase.get(agent.slug) ?? null,
    }))
    .sort((a, b) => {
      if (a.showcase || b.showcase) {
        if (!a.showcase) return 1
        if (!b.showcase) return -1
        if (a.showcase.rank !== b.showcase.rank) return a.showcase.rank - b.showcase.rank
      }
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      return b.approvedAt.localeCompare(a.approvedAt)
    })

  // An anonymous visitor never sees a strategy's code, Example or not — fold
  // the sign-in requirement into the free-preview flag so the list's locked
  // badge matches what the detail page/API will actually allow.
  const strategiesWithPreviewFlag = strategies.map((strategy) => ({
    ...strategy,
    isFreePreview: freePreviewIds.has(strategy.id) && isSignedIn,
    showcase: showcase.get(strategy.slug) ?? null,
  }))

  return (
    <StrategiesClient
      initialStrategies={strategiesWithPreviewFlag}
      condorReady={condorReady}
      initialCohorts={cohorts}
      initialHackathon={hackathon}
      hasStrategyAccess={hasAccess}
      header={<SiteHeader />}
      footer={<SiteFooter />}
    />
  )
}
