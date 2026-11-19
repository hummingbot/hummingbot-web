import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { teamAdminSelect } from "@/botcamp/lib/team-admin"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { Button } from "@/botcamp/components/ui/button"
import { TeamAdministration } from "@/botcamp/components/teams/TeamAdministration"
import { TeamMembersManager } from "@/botcamp/components/admin/TeamMembersManager"
import { TeamAdminSettings } from "@/botcamp/components/admin/TeamAdminSettings"
import { NewTeamForm } from "@/botcamp/components/admin/NewTeamForm"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

async function getTeam(id: string) {
  return prisma.team.findUnique({
    where: { id },
    select: {
      ...teamAdminSelect,
      invites: {
        where: { acceptedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true },
      },
    },
  })
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params

  if (id === "new") {
    return { title: "New Team - Admin - Botcamp" }
  }

  const team = await prisma.team.findUnique({ where: { id }, select: { name: true } })
  if (!team) {
    return { title: "Team Not Found" }
  }

  return { title: `${team.name} - Teams - Admin - Botcamp` }
}

export default async function AdminTeamPage({ params, searchParams }: PageProps) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  if (id === "new") {
    return <NewTeamForm />
  }

  const team = await getTeam(id)
  if (!team) {
    notFound()
  }

  return (
    <div className="space-y-bc-8">
      <PageHeader
        title={team.name}
        description="The same view this team's admins see, with member and admin-only settings added."
        eyebrow={`Admin · Team · ${team.slug}`}
        variant="admin"
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/teams">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Teams
            </Link>
          </Button>
        }
      />

      <TeamAdministration
        team={team}
        basePath={`/admin/teams/${team.id}`}
        tab={tab}
        manage={<TeamMembersManager teamId={team.id} members={team.members} invites={team.invites} />}
        settings={
          <TeamAdminSettings
            team={{
              id: team.id,
              name: team.name,
              slug: team.slug,
              sortOrder: team.sortOrder,
              websiteUrl: team.websiteUrl,
            }}
          />
        }
      />
    </div>
  )
}
