import { notFound } from "next/navigation"
import { auth } from "@/botcamp/lib/preview-session"
import { prisma } from "@/botcamp/lib/prisma"
import { getHackathonEditState } from "@/botcamp/lib/strategy-edit"
import { UserStrategyEditor } from "@/botcamp/components/dashboard/UserStrategyEditor"
import { readPageSuggestions } from "@/botcamp/lib/agent-page-suggestions"
import type { AgentReviewRecord } from "@/botcamp/lib/agent-review"
import { forAuthor, versionSelect } from "@/botcamp/lib/agent-upload"
import { getHackathonApplyEligibility, getStrategyOptions } from "@/botcamp/lib/dashboard-preview-data"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getStrategyForUser(strategyId: number, userId: string) {
  const strategy = await prisma.strategy.findFirst({
    where: {
      id: strategyId,
      authors: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      cohortId: true,
      title: true,
      summary: true,
      details: true,
      strategyType: true,
      tags: true,
      exchanges: true,
      videoURL: true,
      status: true,
      visibility: true,
      agentApprovalRequired: true,
      pageSuggestions: true,
      // One approved agent version pins the page: it can't be deleted.
      agentVersions: { where: { status: "APPROVED" }, select: { id: true }, take: 1 },
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
      cohortRelation: {
        select: { number: true },
      },
      authors: {
        select: {
          user: {
            select: {
              id: true,
              slug: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  })

  return strategy
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const strategyId = parseInt(id)

  if (isNaN(strategyId)) {
    return { title: "Strategy Not Found" }
  }

  return {
    title: `Edit Strategy - Botcamp`,
  }
}

export default async function UserStrategyEditPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  const strategyId = parseInt(id)
  if (isNaN(strategyId)) {
    notFound()
  }

  const strategy = await getStrategyForUser(strategyId, session.user.id)

  if (!strategy) {
    notFound()
  }

  const [hackathonEdit, newestVersion, strategyOptions, hackathonApply, agentVersions] = await Promise.all([
    getHackathonEditState(strategy.id),
    // The agent's state in the editor follows its newest version's review.
    prisma.agentVersion.findFirst({
      where: { strategyId: strategy.id },
      orderBy: { version: "desc" },
      select: { version: true, status: true, reviewNote: true, aiReview: true },
    }),
    // Read-only preview: what the editor fetches on mount in Botcamp.
    getStrategyOptions(),
    getHackathonApplyEligibility(session.user.id),
    strategy.strategyType === "AGENT"
      ? prisma.agentVersion.findMany({
          where: { strategyId: strategy.id },
          select: versionSelect,
          orderBy: { version: "desc" },
        })
      : Promise.resolve([]),
  ])
  // What the author sees of a review, as in the package card (forAuthor):
  // what to fix only on a rejection, never the reviewer's own findings.
  const latestAgentVersion = newestVersion && {
    version: newestVersion.version,
    status: newestVersion.status,
    reviewNote: newestVersion.reviewNote,
    feedback:
      newestVersion.status === "REJECTED"
        ? ((newestVersion.aiReview as AgentReviewRecord | null)?.authorFeedback ?? [])
        : [],
  }

  return (
    <div className="space-y-bc-6">
      <UserStrategyEditor
        strategy={{
          ...strategy,
          hasApprovedAgentVersion: strategy.agentVersions.length > 0,
          latestAgentVersion,
          pageSuggestions: readPageSuggestions(strategy.pageSuggestions),
        }}
        hackathonEdit={hackathonEdit}
        strategyOptions={strategyOptions}
        hackathonApply={hackathonApply}
        agentVersions={agentVersions.map((v) => {
          const version = forAuthor(v)
          return {
            id: version.id,
            version: version.version,
            status: version.status,
            source: version.source,
            sourceRef: version.sourceRef,
            sha256: version.sha256,
            fileCount: version.fileCount,
            warnings: (version.warnings ?? []) as { path?: string; message: string }[],
            reviewNote: version.reviewNote,
            feedback: version.feedback,
            createdAt: version.createdAt.toISOString(),
          }
        })}
      />
    </div>
  )
}
