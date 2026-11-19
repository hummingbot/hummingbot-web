import { timingSafeEqual } from "crypto"
import type { NextRequest } from "next/server"
import type { AgentVersionStatus, Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/botcamp/lib/prisma"
import { sendAgentAwaitingAdminEmail, sendAgentVersionStatusEmail } from "@/botcamp/lib/notifications"

// The AI review of uploaded agents runs outside Botcamp (metabrain). An upload
// waits in PENDING; the reviewer reads the queue through /api/agent-review/*
// and posts a verdict: approve → NEEDS_REVIEW, where an admin gives the final
// check; reject → REJECTED, with feedback the author can act on. The contract
// for the reviewer is docs/agent-review-api.md.

export const AGENT_REVIEWER_TOKEN_ENV = "AGENT_REVIEWER_TOKEN"

// The reviewer authenticates with a service token, not a user session. While
// it's unset the API is off (callers answer 404).
export function reviewerAuth(request: NextRequest): "ok" | "disabled" | "unauthorized" {
  const expected = process.env[AGENT_REVIEWER_TOKEN_ENV]
  if (!expected) return "disabled"
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")
  if (!match) return "unauthorized"
  const given = Buffer.from(match[1])
  const want = Buffer.from(expected)
  return given.length === want.length && timingSafeEqual(given, want) ? "ok" : "unauthorized"
}

const CATEGORIES = [
  "exfiltration",
  "credential_access",
  "fund_movement",
  "prompt_injection",
  "remote_code",
  "shell_exec",
  "obfuscation",
  "persistence",
  "other",
] as const

const FindingSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  category: z.enum(CATEGORIES),
  path: z.string().max(500),
  evidence: z.string().max(2000).default(""),
  explanation: z.string().max(4000),
  blocking: z.boolean().default(false),
})

const AuthorFeedbackSchema = z.object({
  path: z.string().max(500).default(""),
  category: z.enum(CATEGORIES).default("other"),
  message: z.string().min(1).max(2000),
})

export const VerdictSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    summary: z.string().min(1).max(4000),
    findings: z.array(FindingSchema).max(100).default([]),
    authorFeedback: z.array(AuthorFeedbackSchema).max(50).default([]),
    reviewer: z.string().min(1).max(100).default("metabrain"),
    model: z.string().max(100).optional(),
  })
  .refine((v) => v.decision === "approve" || v.authorFeedback.length > 0, {
    message: "A rejection needs authorFeedback the author can act on",
    path: ["authorFeedback"],
  })

export type AgentVerdict = z.infer<typeof VerdictSchema>
export type AgentReviewFinding = z.infer<typeof FindingSchema>
export type AuthorFeedback = z.infer<typeof AuthorFeedbackSchema>

// Stored as AgentVersion.aiReview.
export interface AgentReviewRecord {
  reviewer: string
  model?: string
  decision: "approve" | "reject"
  summary: string
  findings: AgentReviewFinding[]
  // Shown to the author on a rejection (file, category, how to fix); the
  // findings stay admin-only.
  authorFeedback: AuthorFeedback[]
  reviewedAt: string
}

export type RecordVerdictResult = { status: AgentVersionStatus } | { error: "not_found" | "not_pending" }

// Applies the reviewer's verdict to a PENDING version. Conditional on it still
// being PENDING, so a verdict never overwrites an admin's decision or a
// second verdict for the same version.
export async function recordAiVerdict(id: string, verdict: AgentVerdict): Promise<RecordVerdictResult> {
  const status: AgentVersionStatus = verdict.decision === "approve" ? "NEEDS_REVIEW" : "REJECTED"
  const record: AgentReviewRecord = {
    reviewer: verdict.reviewer,
    model: verdict.model,
    decision: verdict.decision,
    summary: verdict.summary,
    findings: verdict.findings,
    authorFeedback: verdict.authorFeedback,
    reviewedAt: new Date().toISOString(),
  }

  const { count } = await prisma.agentVersion.updateMany({
    where: { id, status: "PENDING" },
    data: { status, aiReview: record as unknown as Prisma.InputJsonValue, reviewedAt: new Date() },
  })
  if (count === 0) {
    const exists = await prisma.agentVersion.findUnique({ where: { id }, select: { id: true } })
    return { error: exists ? "not_pending" : "not_found" }
  }

  await sendAgentVersionStatusEmail(id).catch((err) =>
    console.error(`Failed to send agent version email for ${id}:`, err),
  )
  if (status === "NEEDS_REVIEW") {
    await sendAgentAwaitingAdminEmail(id).catch((err) =>
      console.error(`Failed to notify admins about agent version ${id}:`, err),
    )
  }
  return { status }
}
