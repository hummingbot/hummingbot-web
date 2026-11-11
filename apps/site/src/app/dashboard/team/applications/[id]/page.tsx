import { redirect, notFound } from "next/navigation"
import { auth } from "@/botcamp/lib/preview-session"
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

  // Read-only preview: what Botcamp's comment thread fetches on load — the
  // public comments a sponsor reviewer sees.
  const comments = review.strategy
    ? await prisma.strategyComment.findMany({
        where: { strategy: { slug: review.strategy.slug }, deletedAt: null, visibility: "PUBLIC" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          visibility: true,
          author: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true, avatarMimeType: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : []

  return (
    <ApplicationReviewer
      {...review}
      team={team}
      basePath="/dashboard/team"
      comments={comments.map(({ author: { avatarMimeType, ...author }, ...c }) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        author: { ...author, hasAvatar: !!avatarMimeType },
      }))}
    />
  )
}
