"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ArrowLeft, Check, ExternalLink, FileText, Loader2, RotateCcw, X } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { AgentVersionStatusBadge } from "@/botcamp/components/agents/AgentVersionStatusBadge"
import { alertColors } from "@/botcamp/lib/design-constants"
import { formatDateTime, formatFileSize } from "@/botcamp/lib/format"
import { cn } from "@/botcamp/lib/utils"
import type { AgentManifest, AgentPackageIssue } from "@/botcamp/lib/agent-package"
import type { AgentReviewRecord } from "@/botcamp/lib/agent-review"
import type { ScanResult } from "@/botcamp/lib/agent-scan"
import type { PageSuggestions, SuggestibleField } from "@/botcamp/lib/agent-page-suggestions"
import { AgentPageSuggestionsCard } from "@/botcamp/components/admin/AgentPageSuggestionsCard"

interface AgentFile {
  path: string
  size: number
  content: string
}

interface AgentVersionDetail {
  id: string
  version: number
  status: string
  source: string
  sourceUrl: string | null
  sourceRef: string | null
  sha256: string
  createdAt: string
  reviewedAt: string | null
  reviewNote: string | null
  reviewer: string | null
  uploader: string
  manifest: AgentManifest
  warnings: AgentPackageIssue[]
  aiReview: AgentReviewRecord | null
  strategy: { id: number; title: string; slug: string }
}

interface AgentVersionReviewerProps {
  version: AgentVersionDetail
  files: AgentFile[]
  scan: ScanResult
  /** The agent page's text and any suggestion the author hasn't answered yet. */
  page: {
    current: Record<SuggestibleField, string | null>
    pending: PageSuggestions | null
  }
}

const LANGUAGES: Record<string, string> = {
  py: "python",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  json: "json",
  sh: "bash",
}

const SEVERITY_CLASSES: Record<string, string> = {
  high: "text-destructive border-destructive/50 bg-destructive/10",
  medium: "text-warning border-warning/50 bg-warning/10",
  low: "text-muted-foreground border-border",
}

// Past this a file is shown truncated; the highlighter gets slow and the AI
// review already read the whole thing.
const MAX_RENDER_CHARS = 200_000

export function AgentVersionReviewer({ version, files, scan, page }: AgentVersionReviewerProps): React.JSX.Element {
  const router = useRouter()
  const findings = version.aiReview?.findings ?? []
  const flagged = new Set(findings.map((f) => f.path))
  const [selected, setSelected] = useState(findings[0]?.path ?? "AGENT.md")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const file = files.find((f) => f.path === selected) ?? files[0]
  const ext = file?.path.split(".").pop()?.toLowerCase() ?? ""

  const act = async (action: "approve" | "reject" | "rerun") => {
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/admin/agent-versions/${version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Failed to update")
      setNote("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setBusy(null)
    }
  }

  const githubCommit =
    version.source === "GITHUB" && version.sourceUrl && version.sourceRef
      ? version.sourceUrl.replace(/\/tree\/.*$/, "").replace(/\/$/, "") + `/tree/${version.sourceRef}`
      : null

  return (
    <div className="space-y-bc-6">
      <div className="space-y-bc-2">
        <Link href="/admin/agents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Agents
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-bc-tight">
            {version.strategy.title} <span className="font-mono text-base text-muted-foreground">v{version.version}</span>
          </h1>
          <AgentVersionStatusBadge status={version.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Uploaded by {version.uploader} on {formatDateTime(version.createdAt)} ·{" "}
          <Link href={`/admin/strategies/${version.strategy.id}`} className="text-primary hover:underline">
            strategy
          </Link>
          {githubCommit && (
            <>
              {" · "}
              <a href={githubCommit} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                GitHub @ {version.sourceRef!.slice(0, 7)} <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </p>
        <p className="font-mono text-xs text-muted-foreground">sha256 {version.sha256}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          {!version.aiReview && (
            <p className="text-sm text-muted-foreground">
              {version.status === "PENDING" ? "Waiting for the AI reviewer." : "No AI verdict recorded."}
            </p>
          )}
          {version.aiReview && (
            <p className="text-sm">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {version.aiReview.decision === "approve" ? "Approved" : "Rejected"}
              </span>{" "}
              — {version.aiReview.summary}
            </p>
          )}
          {version.aiReview && (
            <p className="font-mono text-xs text-muted-foreground">
              {version.aiReview.reviewer}
              {version.aiReview.model ? ` · ${version.aiReview.model}` : ""} · {formatDateTime(version.aiReview.reviewedAt)}
            </p>
          )}
          {version.aiReview?.authorFeedback && version.aiReview.authorFeedback.length > 0 && (
            <div className="space-y-bc-1">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Sent to the author</p>
              <ul className="list-disc space-y-bc-1 pl-5 text-sm">
                {version.aiReview.authorFeedback.map((f, i) => (
                  <li key={i}>
                    {f.path && <span className="font-mono text-xs">{f.path}: </span>}
                    {f.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {findings.length > 0 && (
            <ul className="space-y-bc-2">
              {findings.map((f, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setSelected(f.path)}
                    className="w-full rounded-bc-md border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", SEVERITY_CLASSES[f.severity])}>
                        {f.severity}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{f.category}</span>
                      <span className="font-mono text-xs">{f.path}</span>
                      {f.blocking && <span className="font-mono text-xs text-destructive">blocking</span>}
                    </div>
                    <p className="mt-2 text-sm">{f.explanation}</p>
                    <pre className="mt-2 overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">{f.evidence}</pre>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {(scan.blocking.length > 0 || scan.hints.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Static Scan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Botcamp&apos;s pattern scan, also sent to the AI reviewer. Leads to check, not verdicts.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-bc-1">
              {[
                ...scan.blocking.map((m) => ({ ...m, blocking: true })),
                ...scan.hints.map((m) => ({ ...m, blocking: false })),
              ].map((m, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setSelected(m.path)}
                    className="w-full rounded px-2 py-1 text-left font-mono text-xs transition-colors hover:bg-muted/50"
                  >
                    <span className={m.blocking ? "text-destructive" : "text-warning"}>
                      {m.rule}
                    </span>{" "}
                    {m.path}:{m.line} <span className="text-muted-foreground">{m.excerpt}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{version.status === "NEEDS_REVIEW" ? "Final Check" : "Decision"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {version.status === "NEEDS_REVIEW"
              ? "The AI review approved this version. Read the files and approve it to let Condor clone it, or reject it with a note for the author."
              : "Revoking an approved version stops new clones. Sending it back puts it in the AI reviewer's queue again."}
          </p>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          {version.reviewedAt && (
            <p className="text-sm text-muted-foreground">
              {version.reviewer
                ? `Decided by ${version.reviewer}`
                : version.status === "NEEDS_REVIEW"
                  ? "Approved by the AI review"
                  : "Decided by the AI review"}{" "}
              on{" "}
              {formatDateTime(version.reviewedAt)}
              {version.reviewNote && <> — “{version.reviewNote}”</>}
            </p>
          )}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note to the author (required to reject or revoke)"
            rows={2}
            maxLength={2000}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => act("approve")}
              disabled={!!busy || version.status !== "NEEDS_REVIEW"}
              title={
                version.status === "PENDING" || version.status === "REJECTED"
                  ? "Only a version the AI review passed can be approved"
                  : undefined
              }
            >
              {busy === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => act("reject")}
              disabled={!!busy || version.status === "REJECTED" || !note.trim()}
            >
              {busy === "reject" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
              {version.status === "APPROVED" ? "Revoke" : "Reject"}
            </Button>
            <Button variant="outline" onClick={() => act("rerun")} disabled={!!busy || version.status === "PENDING"}>
              {busy === "rerun" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Send Back to AI Review
            </Button>
          </div>
          {version.status === "APPROVED" && (
            <p className="text-xs text-muted-foreground">Approved versions can be cloned into Condor right away.</p>
          )}
          {(version.status === "PENDING" || version.status === "REJECTED") && (
            <p className="text-xs text-muted-foreground">
              {version.status === "PENDING"
                ? "Approve unlocks once the AI review passes this version."
                : "The AI review rejected this version. To approve it anyway, send it back to the AI review — every version passes it before an admin's check."}
            </p>
          )}
          {error && <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>{error}</p>}
        </CardContent>
      </Card>

      <AgentPageSuggestionsCard strategyId={version.strategy.id} current={page.current} pending={page.pending} />

      {version.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Structure Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-bc-1 text-sm">
              {version.warnings.map((w, i) => (
                <li key={i}>
                  {w.path && <span className="font-mono text-xs">{w.path}: </span>}
                  {w.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Files ({files.length}) · {version.manifest.name}
          </CardTitle>
          <p className="font-mono text-xs text-muted-foreground">
            {version.manifest.agentKey ?? "no agent_key"} · tools: {version.manifest.tools.join(", ") || "none"}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <ul className="max-h-[32rem] space-y-bc-0.5 overflow-y-auto">
            {files.map((f) => (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => setSelected(f.path)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1 text-left font-mono text-xs transition-colors",
                    f.path === file?.path ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
                    flagged.has(f.path) && "text-warning",
                  )}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{f.path}</span>
                </button>
              </li>
            ))}
          </ul>
          {file && (
            <div className="min-w-0">
              <p className="mb-2 font-mono text-xs text-muted-foreground">
                {file.path} · {formatFileSize(file.size)}
              </p>
              <SyntaxHighlighter
                language={LANGUAGES[ext] ?? "text"}
                style={oneDark}
                showLineNumbers
                customStyle={{ margin: 0, maxHeight: "32rem", fontSize: "0.75rem", borderRadius: "0.375rem" }}
              >
                {file.content.length > MAX_RENDER_CHARS
                  ? file.content.slice(0, MAX_RENDER_CHARS) + "\n\n… truncated"
                  : file.content}
              </SyntaxHighlighter>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
