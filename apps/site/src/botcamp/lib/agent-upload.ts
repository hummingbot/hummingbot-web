import type { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import type { AgentReviewRecord } from "@/botcamp/lib/agent-review"

// The read-only part of Botcamp's agent-upload.ts, for the dashboard preview:
// the review-slot check and the author's view of a version. Storing versions
// (the upload limits, saveAgentVersion) is left out: this site never writes.

// Vercel caps request bodies at 4.5MB; stay under it with room for the
// multipart envelope.
export const MAX_ZIP_BYTES = 4 * 1024 * 1024

// Every stored version goes through the AI review and an admin's check, and
// any signed-in user can upload, so uploads are capped per user. Rejected
// versions count — they were reviewed too; uploads that fail the structure
// check don't, since they're never stored or reviewed. Admins are exempt.
export const MAX_UPLOADS_PER_DAY = 5

export const versionSelect = {
  id: true,
  version: true,
  source: true,
  sourceUrl: true,
  sourceRef: true,
  sha256: true,
  size: true,
  fileCount: true,
  manifest: true,
  warnings: true,
  status: true,
  aiReview: true,
  reviewedAt: true,
  reviewNote: true,
  createdAt: true,
} satisfies Prisma.AgentVersionSelect

// What an author sees of a review: on a rejection, the file, category and
// how-to-fix message for each blocking problem. Not the reviewer's evidence
// or reasoning — that would show an uploader exactly what to reword to get
// past it — and nothing at all for a version that passed.
export function forAuthor({ aiReview, ...version }: Prisma.AgentVersionGetPayload<{ select: typeof versionSelect }>) {
  const feedback =
    version.status === "REJECTED" ? ((aiReview as AgentReviewRecord | null)?.authorFeedback ?? []) : []
  return { ...version, feedback }
}

// One agent at a time in review per person, across all their agents: while
// any agent's newest version is in review, or was rejected, they can't send
// another agent. Only an approval frees the slot; a rejected agent has to be
// fixed (a new version, back in review) or deleted first. Older rejected
// versions an approval has since replaced don't count, and neither does a
// rejected update to an agent that already has an approved version: that
// agent is live and can't be deleted (Condor installs it by slug), so it
// mustn't lock its authors out. Returns the agent holding the slot, if any.
const SLOT_HOLDING_STATUSES = ["PENDING", "NEEDS_REVIEW", "REJECTED"]

export async function agentHoldingReviewSlot(
  userId: string,
): Promise<{ strategyId: number; title: string; version: number; status: string } | null> {
  const agents = await prisma.strategy.findMany({
    where: { strategyType: "AGENT", authors: { some: { userId } } },
    select: {
      id: true,
      title: true,
      agentVersions: { select: { version: true, status: true }, orderBy: { version: "desc" }, take: 1 },
      _count: { select: { agentVersions: { where: { status: "APPROVED" } } } },
    },
  })
  for (const agent of agents) {
    const newest = agent.agentVersions[0]
    const liveUpdateRejected = newest?.status === "REJECTED" && agent._count.agentVersions > 0
    if (newest && SLOT_HOLDING_STATUSES.includes(newest.status) && !liveUpdateRejected) {
      return { strategyId: agent.id, title: agent.title, version: newest.version, status: newest.status }
    }
  }
  return null
}

/** Why `holder` stops this person creating another agent, for the pages that offer it. */
export function reviewSlotMessage(holder: { title: string; status: string }): string {
  return holder.status === "REJECTED"
    ? `Your agent "${holder.title}" wasn't approved — fix it or delete it before you create another`
    : `Your agent "${holder.title}" is in review — you can create another once it's approved`
}
