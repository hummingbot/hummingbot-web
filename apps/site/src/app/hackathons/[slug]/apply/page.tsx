import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { isRegistrationOpen, registrationClosedCopy } from "@/botcamp/lib/hackathon-stages"
import { auth } from "@/botcamp/lib/auth"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { ApplicationForm } from "@/botcamp/components/hackathons/ApplicationForm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { spacing } from "@/botcamp/lib/design-constants"
import { strategyCapRefusal } from "@/botcamp/lib/strategy-create"
import { BOTCAMP_SLUG } from "@/botcamp/lib/hackathon-squads"
import { ArrowRight } from "lucide-react"

// Force dynamic rendering
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getHackathon(slug: string) {
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      teamIds: true,
      maxSelections: true,
      startDate: true,
      registrationStart: true,
      registrationEnd: true,
      raceStart: true,
      raceEnd: true,
    },
  })

  if (!hackathon || hackathon.status === "DRAFT") {
    return null
  }

  return hackathon
}

async function getTeams(hackathon: {
  id: string
  teamIds: string[]
  maxSelections: number
}) {
  if (hackathon.teamIds.length === 0) {
    return []
  }

  const teams = await prisma.team.findMany({
    where: { id: { in: hackathon.teamIds }, slug: { not: BOTCAMP_SLUG } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      logoUrlDark: true,
      websiteUrl: true,
      rules: true,
    },
  })

  // Count applications that have each team in their preferences
  const applications = await prisma.application.findMany({
    where: { hackathonId: hackathon.id },
    select: { teamPreferences: true, selectedTeamId: true },
  })

  const preferenceCountMap = new Map<string, number>()
  const selectedCountMap = new Map<string, number>()

  for (const app of applications) {
    // Count how many apps have this team in preferences (teamPreferences stores team IDs)
    for (const teamId of app.teamPreferences) {
      preferenceCountMap.set(teamId, (preferenceCountMap.get(teamId) || 0) + 1)
    }
    // Count how many apps are selected by this team
    if (app.selectedTeamId) {
      selectedCountMap.set(app.selectedTeamId, (selectedCountMap.get(app.selectedTeamId) || 0) + 1)
    }
  }

  return teams.map((team) => ({
    ...team,
    applicationCount: preferenceCountMap.get(team.id) || 0,
    selectedCount: selectedCountMap.get(team.id) || 0,
  }))
}

async function getUserStrategies(userId: string) {
  const strategies = await prisma.strategy.findMany({
    where: {
      authors: {
        some: { userId },
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      strategyType: true,
      exchanges: true,
      updatedAt: true,
    },
  })

  return strategies.map((s) => ({
    ...s,
    updatedAt: s.updatedAt.toISOString(),
  }))
}

async function getUserApplications(userId: string, hackathonId: string) {
  const applications = await prisma.application.findMany({
    where: {
      userId,
      hackathonId,
    },
    select: {
      id: true,
      status: true,
      teamPreferences: true,
      strategy: {
        select: {
          id: true,
          title: true,
        },
      },
      selectedTeam: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return applications.map((app) => ({
    id: app.id,
    status: app.status,
    teamPreferences: app.teamPreferences,
    strategyId: app.strategy?.id || null,
    strategyTitle: app.strategy?.title || null,
    selectedTeamName: app.selectedTeam?.name || null,
    selectedTeamLogo: app.selectedTeam?.logoUrl || null,
  }))
}

async function getUserEntry(userId: string, hackathonId: string) {
  return prisma.hackathonEntry.findUnique({
    where: {
      hackathonId_userId: {
        hackathonId,
        userId,
      },
    },
  })
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
    title: `Apply - ${hackathon.title} - Botcamp`,
    description: `Apply your agent to compete in ${hackathon.title}`,
  }
}

export default async function HackathonApplyPage({ params }: PageProps) {
  const { slug } = await params
  const session = await auth()

  // Require authentication
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/hackathons/${slug}/apply`)
  }

  const hackathon = await getHackathon(slug)
  if (!hackathon) {
    notFound()
  }

  // Check if registration is open
  const applicationsClosed = !isRegistrationOpen(hackathon)
  if (applicationsClosed) {
    const closed = registrationClosedCopy(hackathon, "Applications")
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          <section className={spacing.section.md}>
            <div className="container mx-auto px-4 max-w-lg">
              <Card>
                <CardHeader>
                  <CardTitle>{closed.title}</CardTitle>
                  <CardDescription>{closed.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link href={`/hackathons/${hackathon.slug}`}>View {hackathon.title}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Check if hackathon has teams configured
  if (hackathon.teamIds.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          <section className={spacing.section.md}>
            <div className="container mx-auto px-4 max-w-lg">
              <Card>
                <CardHeader>
                  <CardTitle>Teams Not Announced</CardTitle>
                  <CardDescription>
                    Teams for this hackathon have not been announced yet.
                    Check back soon!
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Check if user is registered
  const entry = await getUserEntry(session.user.id, hackathon.id)

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          <section className={spacing.section.md}>
            <div className="container mx-auto px-4 max-w-lg">
              <Card>
                <CardHeader>
                  <CardTitle>Registration Required</CardTitle>
                  <CardDescription>
                    You must register for this hackathon before applying to teams.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={`/hackathons/${slug}/register`}>
                      Register Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Fetch data in parallel
  const [teams, userStrategies, existingApplications, canCreateMoreStrategies] = await Promise.all([
    getTeams(hackathon),
    getUserStrategies(session.user.id),
    getUserApplications(session.user.id, hackathon.id),
    strategyCapRefusal(session.user.id, session.user.role ?? "STUDENT").then((refusal) => refusal === null),
  ])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
            <div className="max-w-4xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{hackathon.title}</h1>
              <p className="text-xl text-muted-foreground">
                Submit your trading agent and rank your team preferences.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className={spacing.section.md}>
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardContent className="pt-6">
                <ApplicationForm
                  hackathonSlug={hackathon.slug}
                  teams={teams}
                  userStrategies={userStrategies}
                  existingApplications={existingApplications}
                  maxSelections={hackathon.maxSelections}
                  canCreateMoreStrategies={canCreateMoreStrategies}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
