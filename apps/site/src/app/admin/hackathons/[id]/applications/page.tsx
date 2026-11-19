import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { ArrowLeft } from "lucide-react"
import { AdminApplicationsTable } from "@/botcamp/components/admin/AdminApplicationsTable"
import { FinalRostersPanel } from "@/botcamp/components/admin/FinalRostersPanel"
import { HackathonStatsPanel } from "@/botcamp/components/admin/HackathonStatsPanel"
import { getHackathonDashboardData, buildFinalRosterTeams, getHackathonStats } from "@/botcamp/lib/hackathon-roster"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getHackathon(id: string) {
  return prisma.hackathon.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, teamIds: true, maxSelections: true },
  })
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const hackathon = await getHackathon(id)

  if (!hackathon) {
    return { title: "Hackathon Not Found" }
  }

  return { title: `Applications: ${hackathon.title} - Admin - Botcamp` }
}

export default async function AdminHackathonApplicationsPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  const hackathon = await getHackathon(id)

  if (!hackathon) {
    notFound()
  }

  const isCompleted = hackathon.status === "COMPLETED"

  const [{ rows: applications, teamBreakdown, allSeatsFull }, teamBranding, stats] = await Promise.all([
    getHackathonDashboardData(hackathon.id, hackathon.teamIds, hackathon.maxSelections),
    prisma.team.findMany({
      where: { id: { in: hackathon.teamIds } },
      select: { id: true, logoUrl: true, logoUrlDark: true, slug: true },
    }),
    isCompleted ? getHackathonStats(hackathon.id) : null,
  ])

  const finalRosterTeams = buildFinalRosterTeams(teamBreakdown, new Map(teamBranding.map((t) => [t.id, t])))

  return (
    <div className="space-y-bc-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/admin/hackathons/${hackathon.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {hackathon.title}
        </Link>
      </Button>

      <PageHeader
        title="Applications"
        description={`Review, edit, and manage applications for ${hackathon.title}`}
        variant="admin"
      />

      {stats && <HackathonStatsPanel stats={stats} />}

      {allSeatsFull && (
        <FinalRostersPanel
          teams={finalRosterTeams}
          hackathonId={hackathon.id}
          // Only news while teams are still picking (the Open stage).
          announceComplete={hackathon.status === "REGISTRATION"}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Applications ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminApplicationsTable applications={applications} hackathonId={hackathon.id} />
        </CardContent>
      </Card>
    </div>
  )
}
