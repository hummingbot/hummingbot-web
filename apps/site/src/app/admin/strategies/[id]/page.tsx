import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { StrategyEditor } from "@/botcamp/components/admin/StrategyEditor"
import { getExistingValues } from "@/botcamp/lib/strategy-tags"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getStrategy(id: string) {
  const strategyId = parseInt(id)
  if (isNaN(strategyId)) return null

  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    select: {
      id: true,
      slug: true,
      cohortId: true,
      title: true,
      summary: true,
      details: true,
      tags: true,
      exchanges: true,
      videoURL: true,
      status: true,
      visibility: true,
      featured: true,
      isFree: true,
      createdAt: true,
      updatedAt: true,
      files: {
        select: {
          id: true,
          type: true,
          filename: true,
          mimeType: true,
          size: true,
          url: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      images: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      authors: {
        select: {
          user: {
            select: {
              id: true,
              slug: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      cohortRelation: {
        select: { number: true },
      },
    },
  })

  return strategy
}

async function getCohorts() {
  return prisma.cohort.findMany({
    select: {
      id: true,
      number: true,
      title: true,
    },
    orderBy: { number: "desc" },
  })
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const strategy = await getStrategy(id)

  if (!strategy) {
    return { title: "Strategy Not Found" }
  }

  return {
    title: `Edit ${strategy.title} - Admin - Botcamp`,
  }
}

export default async function AdminStrategyEditorPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  const strategy = await getStrategy(id)

  if (!strategy) {
    notFound()
  }

  // Same vocabulary the user-facing picker offers, seeded sponsor exchanges
  // included — admins are the ones curating it, so they need to see it all.
  const [{ tags, exchanges }, cohorts] = await Promise.all([
    getExistingValues(),
    getCohorts(),
  ])

  return (
    <div className="space-y-bc-6">
      <StrategyEditor
        strategy={strategy}
        cohorts={cohorts}
        tagSuggestions={tags}
        exchangeSuggestions={exchanges}
      />
    </div>
  )
}
