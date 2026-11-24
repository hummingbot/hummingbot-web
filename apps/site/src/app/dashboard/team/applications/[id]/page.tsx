import { redirect, notFound } from "next/navigation"
import { auth } from "@/botcamp/lib/auth"
import { prisma } from "@/botcamp/lib/prisma"
import { getTeamApplicationReview } from "@/botcamp/lib/team-admin"
import { ApplicationReviewer } from "@/botcamp/components/teams/ApplicationReviewer"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Review Application - Team Administration - Botcamp",
}

interface PageProps {
  params: Promise<{ id: string }>
}

async function getUserTeam(userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    include: { team: { select: { id: true, slug: true, name: true } } },
  })
  return membership?.team ?? null
}

export default async function TeamApplicationReviewPage({ params }: PageProps) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) {
    notFound()
  }

  const team = await getUserTeam(session.user.id)
  if (!team) {
    redirect("/dashboard/team")
  }

  // A sponsor rep can only review applications that ranked their own team.
  const review = await getTeamApplicationReview(id, team.id)
  if (!review) {
    notFound()
  }

  return (
    <ApplicationReviewer
      {...review}
      team={team}
      basePath="/dashboard/team"
    />
  )
}
