import { redirect, notFound } from "next/navigation"
import { Metadata } from "next"
import { prisma } from "@/botcamp/lib/prisma"
import { isRegistrationOpen } from "@/botcamp/lib/hackathon-stages"
import { auth } from "@/botcamp/lib/auth"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { EditApplicationForm } from "@/botcamp/components/hackathons/EditApplicationForm"
import { strategyCapRefusal } from "@/botcamp/lib/strategy-create"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Edit Application - Botcamp",
  description: "Edit your hackathon application",
}

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

async function getApplication(applicationId: string, userId: string) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      userId,
    },
    include: {
      hackathon: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          maxSelections: true,
          teamIds: true,
          registrationEnd: true,
        },
      },
      strategy: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
      selectedTeam: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  })

  return application
}

// Includes Botcamp if it's already in teamIds — the form needs to resolve
// names/logos for a legacy application that ranked it before that stopped
// being allowed. EditApplicationForm itself hides Botcamp from the "add a
// new team" picker.
async function getTeams(teamIds: string[]) {
  if (teamIds.length === 0) return []

  return prisma.team.findMany({
    where: { id: { in: teamIds } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      logoUrlDark: true,
      rules: true,
    },
  })
}

async function getUserStrategies(userId: string) {
  const strategies = await prisma.strategy.findMany({
    where: {
      authors: {
        some: { userId },
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      strategyType: true,
      exchanges: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  return strategies
}

export default async function EditApplicationPage({ params }: PageProps) {
  const { slug, id } = await params

  const session = await auth()
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/hackathons/${slug}/applications/${id}/edit`)
  }

  const application = await getApplication(id, session.user.id)

  if (!application) {
    notFound()
  }

  // Verify hackathon slug matches
  if (application.hackathon.slug !== slug) {
    notFound()
  }

  // Only allow editing DRAFT or FINALIZED applications
  if (application.status !== "DRAFT" && application.status !== "FINALIZED") {
    redirect(`/hackathons/${slug}`)
  }

  // Only allow editing during registration, before the submission deadline
  const registrationClosed = !isRegistrationOpen(application.hackathon)
  if (registrationClosed) {
    redirect(`/hackathons/${slug}`)
  }

  const [teams, allUserStrategies, canCreateMoreStrategies, otherApplications] = await Promise.all([
    getTeams(application.hackathon.teamIds),
    getUserStrategies(session.user.id),
    strategyCapRefusal(session.user.id, session.user.role ?? "STUDENT").then((refusal) => refusal === null),
    prisma.application.findMany({
      where: {
        hackathonId: application.hackathon.id,
        userId: session.user.id,
        id: { not: application.id },
      },
      select: { strategyId: true },
    }),
  ])

  // Exclude strategies already committed to the user's other applications for
  // this hackathon (a strategy can only be used in one application at a time).
  const usedElsewhere = new Set(
    otherApplications.map((a) => a.strategyId).filter((id): id is number => id !== null)
  )
  const userStrategies = allUserStrategies.filter((s) => !usedElsewhere.has(s.id))

  // Serialize for client component
  const serializedStrategies = userStrategies.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    strategyType: s.strategyType,
    exchanges: s.exchanges,
    updatedAt: s.updatedAt.toISOString(),
  }))

  const serializedTeams = teams.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    logoUrl: t.logoUrl,
    logoUrlDark: t.logoUrlDark,
    rules: t.rules,
  }))

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="container max-w-5xl py-8 md:py-12">
          <EditApplicationForm
            applicationId={application.id}
            hackathonSlug={application.hackathon.slug}
            teams={serializedTeams}
            currentStrategyId={application.strategy?.id || null}
            currentTeamPreferences={application.teamPreferences}
            userStrategies={serializedStrategies}
            maxSelections={application.hackathon.maxSelections}
            status={application.status}
            canCreateMoreStrategies={canCreateMoreStrategies}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
