import { notFound, redirect } from "next/navigation"
import { auth } from "@/botcamp/lib/auth"
import { prisma } from "@/botcamp/lib/prisma"
import { getTeamApplicationReview } from "@/botcamp/lib/team-admin"
import { ApplicationReviewer } from "@/botcamp/components/teams/ApplicationReviewer"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Review Application - Teams - Admin - Botcamp",
}

interface PageProps {
  params: Promise<{ id: string; applicationId: string }>
}

// An admin reviewing and selecting on a team's behalf — the same screen the
// team's own admins get at /dashboard/team/applications/[id].
export default async function AdminTeamApplicationReviewPage({ params }: PageProps) {
  const { id, applicationId } = await params
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  const team = await prisma.team.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true },
  })
  if (!team) {
    notFound()
  }

  const review = await getTeamApplicationReview(applicationId, team.id)
  if (!review) {
    notFound()
  }

  return <ApplicationReviewer {...review} team={team} basePath={`/admin/teams/${team.id}`} />
}
