import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { AGENT_PACKAGE_LIMITS, type AgentPackageFile, type AgentPackageIssue } from "@/botcamp/lib/agent-package"

// Condor's publish (POST /api/agents), as the contract has it
// (condor/docs/botcamp-agent-hub-contract.md §5.2). Condor sends its own
// export — a JSON bundle with every library file as text — rather than a zip,
// so this turns it into the same files a zip upload yields and the shared
// structure check takes it from there.
//
// The answers are the contract's bare shapes, not this site's `{ data }`
// envelope: Condor reads a 2xx receipt as-is, and an envelope would parse as an
// empty receipt with no submission_id — a publish that silently can't be
// tracked.

export const CONDOR_BUNDLE_KIND = "condor-agent-bundle"

export interface CondorBundleAgent {
  slug: string
  name: string
  description: string
  /** Condor's stable id for the agent across installs, echoed in the receipt. */
  agentUid: string
}

export interface ParsedCondorPublish {
  files: AgentPackageFile[]
  agent: CondorBundleAgent
  notes: string
  /** sha256 of the bundle text, recomputed here — never the client's word. */
  digest: string
  bytes: number
}

export interface SubmissionReason {
  rule: "structural" | "secret-scan" | "human-review"
  detail: string
}

// Timestamps as the contract writes them: ISO 8601, whole seconds, UTC.
export const contractTime = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, "Z")

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex")

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "")

// The request body, checked the way §5.2 asks: the digest is recomputed over
// the exact bundle bytes, and everything recorded is read from the parsed
// bundle, never from the top-level echoes beside it.
export function parseCondorPublish(body: unknown): { publish: ParsedCondorPublish } | { reasons: SubmissionReason[] } {
  const structural = (detail: string) => ({ reasons: [{ rule: "structural" as const, detail }] })
  if (!isRecord(body) || typeof body.bundle !== "string") {
    return structural("The request carries no `bundle` — send the agent's export as a JSON string")
  }

  const raw = Buffer.from(body.bundle, "utf8")
  const digest = sha256(raw)
  if (text(body.digest).toLowerCase() !== digest) {
    return structural("`digest` doesn't match the sha256 of `bundle` — the bundle changed on the way, resend it")
  }

  let bundle: unknown
  try {
    bundle = JSON.parse(body.bundle)
  } catch {
    return structural("`bundle` is not JSON")
  }
  if (!isRecord(bundle) || bundle.kind !== CONDOR_BUNDLE_KIND) {
    return structural(`\`bundle\` is not a ${CONDOR_BUNDLE_KIND}`)
  }
  if (!isRecord(bundle.agent) || !text(bundle.agent.slug)) {
    return structural("The bundle names no agent")
  }
  if (!Array.isArray(bundle.files) || bundle.files.length === 0) {
    return structural("The bundle carries no files")
  }
  // Before any file is hashed or checked. The package check applies maxFiles
  // after dropping debris and what Condor leaves out, so the cap here keeps
  // the same headroom as a zip's entry cap (MAX_ARCHIVE_ENTRIES).
  const maxBundleFiles = AGENT_PACKAGE_LIMITS.maxFiles * 3
  if (bundle.files.length > maxBundleFiles) {
    return structural(`The bundle carries ${bundle.files.length} files; an agent's folder may have ${maxBundleFiles}`)
  }

  const files: AgentPackageFile[] = []
  for (const entry of bundle.files) {
    if (!isRecord(entry) || typeof entry.path !== "string" || typeof entry.text !== "string") {
      return structural("Every bundle file needs a `path` and a `text`")
    }
    // Condor stamps each file with the sha256 of its text; a mismatch is a
    // hand-edited bundle, refused rather than stored as something it isn't.
    if (typeof entry.sha256 === "string" && entry.sha256.toLowerCase() !== sha256(entry.text)) {
      return structural(`${entry.path} doesn't match its own sha256`)
    }
    files.push({ path: entry.path, content: Buffer.from(entry.text, "utf8") })
  }

  return {
    publish: {
      files,
      agent: {
        slug: text(bundle.agent.slug),
        name: text(bundle.agent.name),
        description: text(bundle.agent.description),
        agentUid: text(bundle.agent.agent_uid),
      },
      notes: text(bundle.notes),
      digest,
      bytes: raw.length,
    },
  }
}

// The structure check's errors as §5.2 rejection reasons. A secret is its own
// rule so Condor can say which kind of fix it is.
export function reasonsFromIssues(errors: AgentPackageIssue[]): SubmissionReason[] {
  return errors.map((issue) => ({
    rule: /secret|private key/i.test(issue.message) ? "secret-scan" : "structural",
    detail: issue.path ? `${issue.path}: ${issue.message}` : issue.message,
  }))
}

export function rejected(reasons: SubmissionReason[]) {
  return NextResponse.json({ status: "rejected", reasons }, { status: 400 })
}

// What a stored version's status reads as to Condor (§5.1): anything not yet
// decided is pending — the automated review and the admin's check both happen
// before Condor can clone it.
export function submissionStatus(status: string): "pending" | "published" | "rejected" {
  if (status === "APPROVED") return "published"
  if (status === "REJECTED") return "rejected"
  return "pending"
}

export function receipt(
  version: { id: string; version: number; status: string; createdAt: Date },
  publish: Pick<ParsedCondorPublish, "agent" | "digest" | "bytes">,
) {
  return {
    submission_id: version.id,
    status: submissionStatus(version.status),
    agent_uid: publish.agent.agentUid,
    slug: publish.agent.slug,
    version: version.version,
    digest: publish.digest,
    bytes: publish.bytes,
    submitted_at: contractTime(version.createdAt),
  }
}

// GET /api/submissions/[id] (contract §5.3): a submission is one stored
// version. A rejection carries the author feedback the website shows (file
// and how to fix, never the reviewer's evidence) and the admin's note; a
// published one carries its listing_id, which is the agent page's slug — the
// same id GET/DELETE /api/agents/[slug] take.
export function submissionView(version: {
  id: string
  status: string
  createdAt: Date
  reviewedAt: Date | null
  reviewNote: string | null
  authorFeedback: { path?: string; message: string }[]
  listingId: string
}) {
  const status = submissionStatus(version.status)
  const view: Record<string, unknown> = {
    submission_id: version.id,
    status,
    submitted_at: contractTime(version.createdAt),
  }
  if (status !== "pending" && version.reviewedAt) view.decided_at = contractTime(version.reviewedAt)
  if (status === "rejected") {
    const reasons: SubmissionReason[] = version.authorFeedback.map((f) => ({
      rule: "human-review",
      detail: f.path ? `${f.path}: ${f.message}` : f.message,
    }))
    if (version.reviewNote) reasons.push({ rule: "human-review", detail: version.reviewNote })
    view.reasons = reasons
  }
  if (status === "published") view.listing_id = version.listingId
  return view
}
