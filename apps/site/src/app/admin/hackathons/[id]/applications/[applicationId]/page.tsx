import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { AdminApplicationReviewer } from "@/botcamp/components/admin/AdminApplicationReviewer"
import { summarizeApplicationScores } from "@/botcamp/lib/admin-application"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string; applicationId: string }>
}

const TEXT_EXTENSIONS = [
  ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml", ".txt", ".md",
  ".csv", ".xml", ".html", ".css", ".sh", ".bash", ".toml", ".ini", ".conf", ".config",
]

function isTextFile(mimeType: string | null, filename: string): boolean {
  if (mimeType && (mimeType.startsWith("text/") || mimeType.includes("json") || mimeType.includes("yaml"))) {
    return true
  }
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  return TEXT_EXTENSIONS.includes(ext)
}

async function getApplicationWithDetails(hackathonId: string, applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          slug: true,
          github: true,
          linkedin: true,
        },
      },
      strategy: {
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          details: true,
          tags: true,
          strategyType: true,
          status: true,
          exchanges: true,
          videoURL: true,
          updatedAt: true,
          files: {
            select: {
              id: true,
              filename: true,
              type: true,
              mimeType: true,
              size: true,
              url: true,
              content: true,
            },
          },
          images: {
            select: { id: true, filename: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      hackathon: {
        select: { id: true, slug: true, title: true, teamIds: true, status: true },
      },
      scores: {
        select: {
          adminId: true,
          score: true,
          admin: { select: { name: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  })

  if (!application || application.hackathonId !== hackathonId) {
    return null
  }

  return application
}

export default async function AdminApplicationReviewPage({ params }: PageProps) {
  const { id, applicationId } = await params

  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  const application = await getApplicationWithDetails(id, applicationId)
  if (!application) {
    notFound()
  }

  const teams = await prisma.team.findMany({
    where: { id: { in: application.hackathon.teamIds } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  })

  const scoreSummary = summarizeApplicationScores(application.scores)
  const myScore = application.scores.find((s) => s.adminId === session.user.id)?.score ?? null

  const serializedApplication = {
    id: application.id,
    status: application.status,
    teamPreferences: application.teamPreferences,
    selectedTeamId: application.selectedTeamId,
    adminNote: application.adminNote,
    myScore,
    scoreSummary,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  }

  const serializedStrategy = application.strategy
    ? {
        id: application.strategy.id,
        title: application.strategy.title,
        slug: application.strategy.slug,
        summary: application.strategy.summary,
        details: application.strategy.details,
        tags: application.strategy.tags,
        strategyType: application.strategy.strategyType,
        status: application.strategy.status,
        exchanges: application.strategy.exchanges,
        videoURL: application.strategy.videoURL,
        updatedAt: application.strategy.updatedAt.toISOString(),
        files: application.strategy.files.map((f) =>
          f.type === "LINK"
            ? { id: f.id, filename: f.filename, type: "LINK" as const, url: f.url }
            : {
                id: f.id,
                filename: f.filename,
                type: "FILE" as const,
                mimeType: f.mimeType,
                size: f.size,
                content:
                  f.content && isTextFile(f.mimeType, f.filename)
                    ? Buffer.from(f.content).toString("utf-8")
                    : null,
              }
        ),
        images: application.strategy.images,
      }
    : null

  return (
    <AdminApplicationReviewer
      application={serializedApplication}
      user={application.user}
      strategy={serializedStrategy}
      hackathon={application.hackathon}
      teams={teams}
    />
  )
}
