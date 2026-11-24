import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"
import { agentCountPhrase, SQUAD_RULES } from "@/botcamp/lib/hackathon-squads"
import { isRegistrationOpen } from "@/botcamp/lib/hackathon-stages"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { TeamSponsors } from "@/botcamp/components/hackathons/TeamSponsors"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { ArrowLeft, Code, Zap, Trophy, Rocket } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getHackathonWithTeams(slug: string) {
  // Race clock may have moved the stage since the last render.
  await advanceDueHackathonStages()
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      registrationEnd: true,
      maxSelections: true,
      teamIds: true,
    },
  })

  if (!hackathon || hackathon.status === "DRAFT") {
    return null
  }

  // Fetch teams if teamIds are configured
  let teams: Array<{
    id: string
    slug: string
    name: string
    description: string | null
    logoUrl: string | null
    logoUrlDark: string | null
    websiteUrl: string | null
    rules: string | null
    primaryColor: string | null
    sortOrder: number
    _count: { selectedApplications: number }
  }> = []

  if (hackathon.teamIds && hackathon.teamIds.length > 0) {
    // Explicit select — the full row includes the logoData/logoDataDark Bytes
    // columns, which can't cross the server->client boundary into TeamSponsors
    // (Next's dev-mode RSC serializer throws "ArrayBuffer is not detachable").
    teams = await prisma.team.findMany({
      where: {
        id: { in: hackathon.teamIds },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        logoUrlDark: true,
        websiteUrl: true,
        rules: true,
        primaryColor: true,
        sortOrder: true,
        _count: {
          select: {
            selectedApplications: {
              where: {
                hackathonId: hackathon.id,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    })
  }

  return {
    ...hackathon,
    teams,
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await getHackathonWithTeams(slug)

  if (!hackathon) {
    return { title: "Hackathon Not Found" }
  }

  return {
    title: `Teams - ${hackathon.title} - Botcamp`,
    description: `View the sponsor teams and their trading agents in ${hackathon.title}`,
  }
}

export default async function HackathonTeamsPage({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await getHackathonWithTeams(slug)

  if (!hackathon) {
    notFound()
  }

  const applicationsOpen = isRegistrationOpen(hackathon)
  const preRace = applicationsOpen || hackathon.status === "COMING_SOON"
  const isLive = hackathon.status === "ACTIVE"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-20 bg-gradient-to-b from-muted/50 via-primary/5 to-background relative overflow-hidden">
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            {/* Back link */}
            <Button variant="ghost" size="sm" asChild className="mb-8 -ml-2">
              <Link href={`/hackathons/${hackathon.slug}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {hackathon.title}
              </Link>
            </Button>

            {/* Section Header */}
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 px-4 py-1.5 border-primary/50">
                <Rocket className="h-4 w-4 mr-2 text-primary" />
                {preRace ? "Choose Your Squad" : isLive ? "Racing Now" : "The Grid"}
              </Badge>
              <h1 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl mb-4">
                The Squads
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
                {preRace
                  ? `Build your AI trading agent in Condor. Each squad fields ${agentCountPhrase(hackathon.maxSelections)} in the competition.`
                  : `Each squad fields ${agentCountPhrase(hackathon.maxSelections)}, racing with real capital.`}
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  <span>Build with Condor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-secondary" />
                  <span>{SQUAD_RULES.startingCapital}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span>Win prizes from sponsors</span>
                </div>
              </div>
            </div>

            {/* Team Sponsors Grid */}
            {hackathon.teams.length > 0 ? (
              <TeamSponsors
                teams={hackathon.teams}
                hackathonSlug={hackathon.slug}
                maxSelections={hackathon.maxSelections}
                applicationsOpen={applicationsOpen}
                embedded
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No teams have been announced yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Sponsor CTA — only while there's still an edition to join */}
      </main>
      <SiteFooter />
    </div>
  )
}
