import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { Button } from "@/botcamp/components/ui/button"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { ArrowLeft } from "lucide-react"
import { getRaceRosterBySlug } from "@/botcamp/lib/race-feed"
import { STALE_AFTER_MS } from "@/botcamp/lib/hackathon-leaderboard-data"
import { RaceFeedMonitor, type FeedAgentRow, type FeedStatus } from "@/botcamp/components/admin/RaceFeedMonitor"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getHackathon(id: string) {
  return prisma.hackathon.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true, teamIds: true, raceFeedTokenHash: true, raceFeedTokenCreatedAt: true },
  })
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const hackathon = await getHackathon(id)
  return { title: hackathon ? `Race Feed: ${hackathon.title} - Admin - Botcamp` : "Hackathon Not Found" }
}

export default async function AdminHackathonRaceFeedPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  const hackathon = await getHackathon(id)
  if (!hackathon) notFound()

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 3_600_000)
  const [roster, latest, lastReceipt, recentReceipts] = await Promise.all([
    getRaceRosterBySlug(hackathon.id, hackathon.teamIds),
    prisma.raceMetric.findMany({
      where: { hackathonId: hackathon.id },
      distinct: ["applicationId"],
      orderBy: [{ applicationId: "asc" }, { timestamp: "desc" }],
      select: { applicationId: true, timestamp: true, pnlQuote: true, volumeQuote: true },
    }),
    prisma.raceFeedReceipt.findFirst({
      where: { hackathonId: hackathon.id },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true, timestamp: true, accepted: true, unknownIds: true },
    }),
    prisma.raceFeedReceipt.findMany({
      where: { hackathonId: hackathon.id, receivedAt: { gte: dayAgo } },
      select: { unknownIds: true },
    }),
  ])

  const latestByApp = new Map(latest.map((r) => [r.applicationId, r]))
  const agents: FeedAgentRow[] = roster.map((r) => {
    const reading = latestByApp.get(r.applicationId)
    return {
      agentId: r.agentId,
      strategyTitle: r.strategyTitle,
      team: r.team.name,
      driver: r.driver,
      reading: reading
        ? {
            timestamp: reading.timestamp.toISOString(),
            pnlQuote: reading.pnlQuote,
            volumeQuote: reading.volumeQuote,
            stale: now.getTime() - reading.timestamp.getTime() > STALE_AFTER_MS,
          }
        : null,
    }
  })

  const feed: FeedStatus = {
    tokenConfigured: !!hackathon.raceFeedTokenHash,
    tokenCreatedAt: hackathon.raceFeedTokenCreatedAt?.toISOString() ?? null,
    endpointPath: `/api/hackathons/${hackathon.slug}/race-data`,
    lastReceipt: lastReceipt
      ? {
          receivedAt: lastReceipt.receivedAt.toISOString(),
          timestamp: lastReceipt.timestamp.toISOString(),
          accepted: lastReceipt.accepted,
          unknownIds: lastReceipt.unknownIds,
        }
      : null,
    unknownIds: [...new Set(recentReceipts.flatMap((r) => r.unknownIds))].sort(),
    staleAfterMinutes: STALE_AFTER_MS / 60_000,
  }

  return (
    <div className="space-y-bc-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/admin/hackathons/${hackathon.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {hackathon.title}
        </Link>
      </Button>

      <PageHeader
        title="Race Feed"
        description="What the Condor routine has sent for each selected agent. The leaderboard is built from these readings."
        variant="admin"
      />

      <RaceFeedMonitor hackathonId={hackathon.id} feed={feed} agents={agents} />
    </div>
  )
}
