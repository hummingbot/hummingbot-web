import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { servableAvatarUrl } from "@/botcamp/lib/botcamp-assets"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { StrategyCard } from "@/botcamp/components/strategies/StrategyCard"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import { YouTubeFacade } from "@/components/ui/youtube-facade"
import {
  Calendar,
  Users,
  Trophy,
  ArrowLeft,
  ExternalLink,
} from "lucide-react"

// Botcamp's public cohort recap (botcamp.xyz/cohorts/cohort<N>/recap): the
// Demo Day video and the cohort's certified strategies, read from its database.

export const dynamic = "force-dynamic"

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

interface PageProps {
  params: Promise<{ cohortNumber: string }>
}

async function getCohortData(cohortNumber: number) {
  const cohort = await prisma.cohort.findUnique({
    where: { number: cohortNumber },
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      demoDayUrl: true,
      _count: {
        select: { enrollments: true },
      },
    },
  })

  if (!cohort) return null

  const strategies = await prisma.strategy.findMany({
    where: {
      cohortId: cohort.id,
      status: "CERTIFIED",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      tags: true,
      exchanges: true,
      videoURL: true,
      strategyType: true,
      _count: {
        select: { files: true },
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
    orderBy: { title: "asc" },
  })

  return { cohort, strategies }
}

export async function generateMetadata({ params }: PageProps) {
  const { cohortNumber: cohortNumberStr } = await params
  const cohortNumber = parseInt(cohortNumberStr.replace("cohort", ""))
  if (isNaN(cohortNumber)) return { title: "Cohort Not Found" }

  return {
    title: `Botcamp Cohort ${cohortNumber} - Botcamp`,
    description: `Botcamp Cohort ${cohortNumber} - View the certified strategies and Demo Day presentations`,
  }
}

export default async function CohortRecapPage({ params }: PageProps) {
  const { cohortNumber: cohortNumberStr } = await params
  const cohortNumber = parseInt(cohortNumberStr.replace("cohort", ""))

  if (isNaN(cohortNumber)) {
    notFound()
  }

  const data = await getCohortData(cohortNumber)

  if (!data) {
    notFound()
  }

  const { cohort, strategies } = data

  const formatDateRange = (start: Date, end: Date) => {
    const startStr = new Date(start).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
    const endStr = new Date(end).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
    return `${startStr} - ${endStr}`
  }

  return (
    <div className={`min-h-screen flex flex-col ${pageBackgrounds.cohorts}`}>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-background py-16 md:py-24">
          <div className="absolute inset-0 bg-radial-[ellipse_at_top] from-blue-900/20 via-transparent to-transparent" />

          <div className="container mx-auto px-4 relative z-10">
            <Link
              href="/botcamp#cohorts"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              All Cohorts
            </Link>

            <div className="max-w-4xl">
              <Badge variant="outline" className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
                Completed
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Botcamp Cohort {cohort.number}
              </h1>

              <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                {cohort.description || `Highlights and certified strategies from Botcamp Cohort ${cohort.number}.`}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>{formatDateRange(cohort.startDate, cohort.endDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>{cohort._count.enrollments} participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span>{strategies.length} certified strategies</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Day & Strategies Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl font-bold mb-8">Demo Day & Certified Strategies</h2>

            {/* Demo Day Video */}
            {cohort.demoDayUrl && (() => {
              const videoId = extractYouTubeId(cohort.demoDayUrl)
              if (!videoId) return null
              return (
                <div className="max-w-4xl mx-auto mb-12">
                  <YouTubeFacade
                    videoId={videoId}
                    title={`Cohort ${cohort.number} Demo Day`}
                    className="rounded-bc-xl shadow-xl border border-border"
                  />
                </div>
              )
            })()}

            {strategies.length === 0 ? (
              <p className="text-muted-foreground">No certified strategies from this cohort yet.</p>
            ) : (
              <div className="space-y-bc-3">
                {strategies.map((strategy, index) => {
                  const authors = strategy.authors.map((sa) => ({
                    slug: sa.user.slug || sa.user.id,
                    name:
                      sa.user.name ||
                      `${sa.user.firstName || ""} ${sa.user.lastName || ""}`.trim() ||
                      "Anonymous",
                    avatarURL: servableAvatarUrl(sa.user.avatarUrl),
                    profilePublic: sa.user.profileVisibility === "PUBLIC",
                  }))

                  return (
                    <StrategyCard
                      key={strategy.id}
                      strategy={{
                        id: strategy.id,
                        slug: strategy.slug,
                        title: strategy.title,
                        summary: strategy.summary,
                        tags: strategy.tags,
                        exchanges: strategy.exchanges,
                        cohort: cohort.number,
                        hasFiles: strategy._count.files > 0,
                        videoURL: strategy.videoURL,
                        strategyType: strategy.strategyType,
                        authors,
                      }}
                      animationDelay={index * 30}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Build Your Own Strategy?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join the next Botcamp cohort and learn to build professional trading strategies.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/botcamp#cohorts">
                  View Upcoming Cohorts
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/hub">
                  Browse All Strategies
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
