import { z } from "zod"

// The types of Botcamp's agent-review.ts, for the read-only dashboard preview.
// Recording verdicts (a write) and the reviewer's token check are left out.

// The AI review of uploaded agents runs outside Botcamp (metabrain). An upload
// waits in PENDING; the reviewer reads the queue through /api/agent-review/*
// and posts a verdict: approve → NEEDS_REVIEW, where an admin gives the final
// check; reject → REJECTED, with feedback the author can act on. The contract
// for the reviewer is docs/agent-review-api.md.

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
