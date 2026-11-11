import { notFound } from "next/navigation"
import { auth } from "@/botcamp/lib/preview-session"
import { prisma } from "@/botcamp/lib/prisma"
import { resolveBotcampImageUrl } from "@/botcamp/lib/botcamp-assets"
import { teamAdminSelect } from "@/botcamp/lib/team-admin"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { TeamAdministration } from "@/botcamp/components/teams/TeamAdministration"
import { Handshake } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "My Team - Dashboard - Botcamp",
}

// Access control invariant for this whole page: only users with a TeamMember
// row can see it at all, and getUserTeam only ever resolves *their own* team
// — so a sponsor rep never sees another team's roster/applicants/settings.
// The PATCH endpoint (/api/teams/[teamSlug]) re-checks this server-side via
// requireTeamMember, so it can't be bypassed even with a crafted request.
async function getUserTeam(userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    select: { team: { select: teamAdminSelect } },
  })
  const team = membership?.team ?? null
  if (!team) return null
  // Botcamp stores logo paths relative to botcamp.xyz; resolve them for this site.
  const [logoUrl, logoUrlDark] = await Promise.all([
    resolveBotcampImageUrl(team.logoUrl),
    resolveBotcampImageUrl(team.logoUrlDark),
  ])
  return { ...team, logoUrl, logoUrlDark }
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function MyTeamPage({ searchParams }: PageProps) {
  const { tab } = await searchParams
  const session = await auth()
  if (!session?.user?.id) {
    notFound()
  }

  const team = await getUserTeam(session.user.id)

  if (!team) {
    return (
      <div className="space-y-bc-8">
        <PageHeader title="My Team" variant="admin" />
        <div className="rounded-bc-xl border border-border bg-card">
          <EmptyState
            icon={Handshake}
            title="You're not part of a sponsor team"
            description="This page is only for members of a hackathon sponsor team. Contact the Botcamp admin team if you believe this is a mistake."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-bc-8">
      <PageHeader
        title="Team Administration"
        description="Manage your sponsor team's public info and hackathon applicants"
        eyebrow={`Sponsor · ${team.slug}`}
        variant="admin"
      />

      <TeamAdministration team={team} basePath="/dashboard/team" tab={tab} />
    </div>
  )
}
