import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { rateLimit } from "@/botcamp/lib/rate-limit"
import {
  AgentPackageReadError,
  buildAgentArchive,
  readAgentZip,
  validateAgentPackage,
  type AgentPackageFile,
} from "@/botcamp/lib/agent-package"
import type { AgentReviewRecord } from "@/botcamp/lib/agent-review"

// Storing a new agent version, shared by the strategy editor's upload
// (/api/user/strategies/[id]/agent-versions) and Condor's publish
// (/api/condor/agents), so both get the same checks and limits.

// Vercel caps request bodies at 4.5MB; stay under it with room for the
// multipart envelope.
export const MAX_ZIP_BYTES = 4 * 1024 * 1024

// Every stored version goes through the AI review and an admin's check, and
// any signed-in user can upload, so uploads are capped per user. Rejected
// versions count — they were reviewed too; uploads that fail the structure
// check don't, since they're never stored or reviewed. Admins are exempt.
export const MAX_UPLOADS_PER_DAY = 5
const DAY_MS = 24 * 60 * 60 * 1000

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
  db: Pick<Prisma.TransactionClient, "strategy"> = prisma,
): Promise<{ strategyId: number; title: string; version: number; status: string; live: boolean } | null> {
  const agents = await db.strategy.findMany({
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
      // `live`: an earlier version is approved, so Condor serves that one while this one is reviewed.
      return {
        strategyId: agent.id,
        title: agent.title,
        version: newest.version,
        status: newest.status,
        live: agent._count.agentVersions > 0,
      }
    }
  }
  return null
}

/** Why `holder` stops this person creating another agent, for the pages that offer it. */
// An update to an agent that's already live is a version in review, not the
// agent: say which one, so it doesn't read as if the agent left Condor.
export function reviewSlotMessage(holder: { title: string; status: string; version: number; live: boolean }): string {
  if (holder.status === "REJECTED") {
    return `Your agent "${holder.title}" wasn't approved — fix it or delete it before you create another`
  }
  return holder.live
    ? `Version ${holder.version} of "${holder.title}" is in review — you can create another agent once it's decided`
    : `Your agent "${holder.title}" is in review — you can create another once it's approved`
}

// Checked before the zip is read, so a refused upload costs a
// couple of queries, and again by saveAgentVersion under a per-user lock, so
// parallel uploads can't all pass the first check. `strategyId` is null for
// an agent that doesn't exist yet. Fixing the agent that holds the slot after
// a rejection is always allowed — that's how the slot is freed.
export async function uploadLimitError(
  userId: string,
  strategyId: number | null,
  db: Pick<Prisma.TransactionClient, "agentVersion" | "strategy"> = prisma,
): Promise<NextResponse | null> {
  const holder = await agentHoldingReviewSlot(userId, db)
  const fixingIt = holder?.strategyId === strategyId && holder.status === "REJECTED"
  if (holder && !fixingIt) {
    return NextResponse.json(
      {
        error:
          holder.strategyId === strategyId
            ? `Version ${holder.version} is still being reviewed — upload again once it's reviewed`
            : holder.status === "REJECTED"
              ? `Your agent "${holder.title}" wasn't approved — fix it or delete it before you send another`
              : holder.live
                ? `Version ${holder.version} of "${holder.title}" is still in review — you can send another agent once it's decided`
                : `Your agent "${holder.title}" is still in review — you can send another once it's approved`,
      },
      { status: 409 },
    )
  }

  const since = new Date(Date.now() - DAY_MS)
  const recent = await db.agentVersion.findMany({
    where: { uploadedById: userId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  if (recent.length >= MAX_UPLOADS_PER_DAY) {
    // The window frees up when the oldest upload in it turns 24h old.
    const retryAt = new Date(recent[0].createdAt.getTime() + DAY_MS)
    const response = NextResponse.json(
      {
        error: `You can upload ${MAX_UPLOADS_PER_DAY} agent versions per day — try again after ${retryAt.toISOString().slice(11, 16)} UTC`,
        retryAt: retryAt.toISOString(),
      },
      { status: 429 },
    )
    response.headers.set("Retry-After", String(Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1000))))
    return response
  }
  return null
}

// Reading a package — the New Agent flow's check, or an upload — is capped
// per person, whether or not it ends in a stored version: each read inflates
// and checks up to a 4MB zip, and neither a check nor a refused or identical
// upload counts toward MAX_UPLOADS_PER_DAY. A GitHub link also costs three
// calls against the site's shared GitHub token, so unbounded reads could
// starve everyone's. Generous for someone fixing a package by hand.
export const MAX_PACKAGE_READS_PER_HOUR = 30
const HOUR_MS = 60 * 60 * 1000

// Counted per person by rateLimit. Only a read that's let through is
// recorded, so retrying while refused doesn't push the wait further out.
// Admins aren't capped (callers skip it).
export async function packageReadLimitError(userId: string): Promise<NextResponse | null> {
  const limit = await rateLimit(`agent-package-read:${userId}`, MAX_PACKAGE_READS_PER_HOUR, HOUR_MS)
  const retryAt = limit.ok ? null : new Date(Date.now() + limit.retryAfterSeconds * 1000)
  if (!retryAt) return null
  const response = NextResponse.json(
    {
      error: `Too many package checks in the last hour — try again after ${retryAt.toISOString().slice(11, 16)} UTC`,
      retryAt: retryAt.toISOString(),
    },
    { status: 429 },
  )
  response.headers.set("Retry-After", String(Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1000))))
  return response
}

export interface AgentUpload {
  files: AgentPackageFile[]
  source: "ZIP" | "GITHUB" | "CONDOR"
  sourceUrl: string | null
  sourceRef: string | null
}

// The package in a request: the agent folder, zipped in the browser and sent
// as multipart `file` (src/lib/agent-folder-zip.ts). The website takes only
// that — no GitHub links — so what's checked and reviewed is exactly the
// folder the author picked. Pass `form` when the caller already read the body.
export async function readAgentUpload(
  request: NextRequest,
  form?: FormData,
): Promise<{ upload: AgentUpload; error?: never } | { error: NextResponse; upload?: never }> {
  try {
    if (!form && (request.headers.get("content-type") ?? "").includes("application/json")) {
      return {
        error: NextResponse.json({ error: "Upload the agent folder — links aren't accepted" }, { status: 400 }),
      }
    }

    const file = (form ?? (await request.formData())).get("file")
    if (!(file instanceof File)) {
      return { error: NextResponse.json({ error: "Upload the agent folder" }, { status: 400 }) }
    }
    if (file.size > MAX_ZIP_BYTES) {
      return { error: NextResponse.json({ error: "The agent folder is over 4MB once zipped" }, { status: 400 }) }
    }
    const files = await readAgentZip(Buffer.from(await file.arrayBuffer()))
    return { upload: { files, source: "ZIP", sourceUrl: null, sourceRef: null } }
  } catch (error) {
    if (error instanceof AgentPackageReadError) {
      return { error: NextResponse.json({ error: error.message }, { status: 400 }) }
    }
    // JSZip throws plain Errors on a corrupt or non-zip upload.
    if (error instanceof Error && /zip|central directory|signature/i.test(error.message)) {
      return { error: NextResponse.json({ error: "Couldn't read the uploaded folder" }, { status: 400 }) }
    }
    throw error
  }
}

export type CheckedAgentPackage = Extract<ReturnType<typeof validateAgentPackage>, { ok: true }>

// The structure check; an invalid package is answered with the full report
// (422) and never stored.
export function checkAgentPackage(
  files: AgentPackageFile[],
): { report: CheckedAgentPackage; error?: never } | { error: NextResponse; report?: never } {
  const report = validateAgentPackage(files)
  if (!report.ok) {
    return {
      error: NextResponse.json(
        { error: "The agent package has errors", errors: report.errors, warnings: report.warnings },
        { status: 422 },
      ),
    }
  }
  return { report }
}

// Store a checked package as the strategy's next version: an immutable
// PENDING snapshot, where it waits for the external AI review
// (docs/agent-review-api.md). With `enforceLimits` (everyone but admins) the
// upload limits are checked again in the same transaction as the insert,
// under a per-user advisory lock that serializes that user's uploads.
export async function saveAgentVersion(
  strategyId: number,
  userId: string,
  report: CheckedAgentPackage,
  upload: Omit<AgentUpload, "files">,
  { enforceLimits }: { enforceLimits: boolean },
) {
  const { archive, sha256 } = await buildAgentArchive(report.files)

  try {
    return await prisma.$transaction(async (tx) => {
      if (enforceLimits) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agent-upload:${userId}`}))`
        const limited = await uploadLimitError(userId, strategyId, tx)
        if (limited) return { error: limited }
      }

      const latest = await tx.agentVersion.findFirst({
        where: { strategyId },
        select: { version: true, sha256: true },
        orderBy: { version: "desc" },
      })
      if (latest?.sha256 === sha256) {
        return {
          error: NextResponse.json({ error: `Identical to version ${latest.version} — nothing changed` }, { status: 409 }),
        }
      }

      const created = await tx.agentVersion.create({
        data: {
          strategyId,
          version: (latest?.version ?? 0) + 1,
          source: upload.source,
          sourceUrl: upload.sourceUrl,
          sourceRef: upload.sourceRef,
          archive,
          sha256,
          size: archive.length,
          fileCount: report.files.length,
          manifest: report.manifest as unknown as Prisma.InputJsonValue,
          warnings: report.warnings as unknown as Prisma.InputJsonValue,
          uploadedById: userId,
        },
        select: versionSelect,
      })
      return { version: created }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: NextResponse.json({ error: "Another upload just landed — try again" }, { status: 409 }) }
    }
    throw error
  }
}
