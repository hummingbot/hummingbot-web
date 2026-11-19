import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { HackathonResources } from "@/botcamp/components/hackathons/HackathonResources"
import {
  findRaceWindow,
  fmtFull,
  getCurrentStageIndex,
  getStagePhases,
  isRegistrationOpen,
  WINNERS_ANNOUNCED,
  FINALS_SESSION_SELECT,
} from "@/botcamp/lib/hackathon-stages"
import { BOTCAMP_SLUG } from "@/botcamp/lib/hackathon-squads"
import { eyebrow } from "@/botcamp/lib/design-constants"
import { resolveStarterKit } from "@/botcamp/lib/hackathon-starter-kit"

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

// Certified Cohort 13 submissions shown as worked examples on this page — the
// slugs are the config; everything rendered comes from the Strategy records.
const CONTROLLER_EXAMPLE_SLUGS = [
  "cohort-13-market-making-at-the-touch",
  "cohort-13-pmm-mister-dynamic",
  "cohort-13-flowedge",
]
// Condor reference agents are Strategy records seeded by
// scripts/add-agent-examples.ts — no code files, just a LINK to their GitHub
// directory in github.com/hummingbot/condor.
const AGENT_EXAMPLE_SLUGS = [
  "market-making-expert",
  "solana-dex-lp-expert",
  "delta-neutral-funding-agent",
]

/** Fetches example strategies in the given slug order, for StrategyCard. */
async function getExampleStrategies(slugs: string[]) {
  const strategies = await prisma.strategy.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      tags: true,
      exchanges: true,
      videoURL: true,
      strategyType: true,
      cohortRelation: { select: { number: true } },
      _count: { select: { files: true } },
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
  })

  return slugs.flatMap((slug) => {
    const s = strategies.find((row) => row.slug === slug)
    if (!s) return []
    return [
      {
        strategy: {
          id: s.id,
          slug: s.slug,
          title: s.title,
          summary: s.summary,
          tags: s.tags,
          exchanges: s.exchanges,
          cohort: s.cohortRelation?.number ?? null,
          hasFiles: s._count.files > 0,
          videoURL: s.videoURL,
          strategyType: s.strategyType,
          authors: s.authors.map((sa) => ({
            slug: sa.user.slug || sa.user.id,
            name:
              sa.user.name ||
              `${sa.user.firstName || ""} ${sa.user.lastName || ""}`.trim() ||
              "Anonymous",
            avatarURL: sa.user.avatarUrl,
            profilePublic: sa.user.profileVisibility === "PUBLIC",
          })),
        },
      },
    ]
  })
}

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getHackathon(slug: string) {
  // Race clock may have moved the stage since the last render.
  await advanceDueHackathonStages()
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      registrationStart: true,
      registrationEnd: true,
      startDate: true,
      endDate: true,
      teamIds: true,
      maxSelections: true,
      // Never raceHosts here — hosts are for seated builders only.
      starterKit: true,
      ...FINALS_SESSION_SELECT,
    },
  })

  if (!hackathon || hackathon.status === "DRAFT") {
    return null
  }

  const { sessions, ...rest } = hackathon
  // Null until Race Start or the finals session is set (e.g. while Coming Soon).
  return { ...rest, sessions, finals: findRaceWindow({ ...rest, sessions }) }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: { title: true, status: true },
  })

  // A draft's name stays private, even in the tab title of its 404.
  if (!hackathon || hackathon.status === "DRAFT") {
    return { title: "Hackathon Not Found" }
  }

  return {
    title: `Resources and Rules - ${hackathon.title} - Botcamp`,
    description: `Official rules and reference material for ${hackathon.title} builders`,
  }
}

export default async function HackathonResourcesPage({ params }: PageProps) {
  const { slug } = await params

  const hackathon = await getHackathon(slug)
  if (!hackathon) {
    notFound()
  }

  const [controllerExamples, agentExamples, sponsorTeams] = await Promise.all([
    getExampleStrategies(CONTROLLER_EXAMPLE_SLUGS),
    getExampleStrategies(AGENT_EXAMPLE_SLUGS),
    // Sponsors only — Botcamp hosts the cup rather than sponsoring a venue.
    prisma.team.findMany({
      where: { id: { in: hackathon.teamIds }, slug: { not: BOTCAMP_SLUG } },
      select: { id: true, slug: true, name: true, logoUrl: true, logoUrlDark: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  // Same stage data the landing page timeline uses, flattened for a compact
  // docs-style list (icons can't cross into the client component).
  const stageDates = hackathon
  const currentStage = getCurrentStageIndex(stageDates)
  const timeline = {
    phases: getStagePhases(stageDates).map(({ label, date, desc }, i) => ({
      label,
      date,
      desc,
      status:
        i < currentStage
          ? ("done" as const)
          : i === currentStage
            ? ("current" as const)
            : ("upcoming" as const),
    })),
    winnersAnnounced: fmtDate(WINNERS_ANNOUNCED),
  }

  const teamCount = hackathon.teamIds.length
  const rules = {
    hackathonTitle: hackathon.title,
    // Icons are dropped — `phases` crosses into a client component, so only
    // serializable fields may be passed.
    phases: getStagePhases(stageDates).map(({ label, date, desc }) => ({
      label,
      date,
      desc,
    })),
    winnersAnnounced: fmtDate(WINNERS_ANNOUNCED),
    finalsCodeFreeze: hackathon.finals ? fmtFull(hackathon.finals.codeFreeze) : null,
    applicationsClose: hackathon.registrationEnd ? fmtDate(hackathon.registrationEnd) : null,
    rankedDriverCount: teamCount * hackathon.maxSelections,
    slotsPerSquad: hackathon.maxSelections,
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-6xl pt-8 pb-6 md:pt-10 md:pb-7">
              <p className={eyebrow}>{hackathon.title}</p>
              <h1 className="text-2xl md:text-4xl font-bold tracking-bc-tight leading-tight mt-2 mb-3">
                Resources and Rules
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                The official rules, plus everything you need to build your agent — videos, guides,
                examples, and support.
              </p>
            </div>
          </div>
        </div>

        <HackathonResources
          hackathonSlug={hackathon.slug}
          applicationsOpen={isRegistrationOpen(hackathon)}
          rules={rules}
          starterKit={resolveStarterKit(hackathon.starterKit).kit}
          controllerExamples={controllerExamples}
          agentExamples={agentExamples}
          sponsorTeams={sponsorTeams}
          timeline={timeline}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
