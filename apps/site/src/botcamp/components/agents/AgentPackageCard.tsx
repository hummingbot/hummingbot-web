"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, Check, Copy, Loader2, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { AgentPackageGuide } from "@/botcamp/components/agents/AgentPackageGuide"
import { AgentVersionStatusBadge } from "@/botcamp/components/agents/AgentVersionStatusBadge"
import {
  FolderTooLargeError,
  filesFromDrop,
  filesFromFolderInput,
  folderName,
  zipFolder,
  type FolderFile,
} from "@/botcamp/lib/agent-folder-zip"
import { alertColors } from "@/botcamp/lib/design-constants"
import { formatDateTime } from "@/botcamp/lib/format"
import { cn } from "@/botcamp/lib/utils"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface AgentVersion {
  id: string
  version: number
  status: string
  source: string
  sourceRef: string | null
  sha256: string
  fileCount: number
  warnings: { path?: string; message: string }[]
  reviewNote: string | null
  feedback: { path: string; category: string; message: string }[]
  createdAt: string
}

interface Issue {
  path?: string
  message: string
}

export type AgentPackageVersion = AgentVersion

interface AgentPackageCardProps {
  /** Read-only preview: the versions, read on the server (Botcamp fetches them from its API). */
  initialVersions: AgentPackageVersion[]
  strategyId: number
  strategySlug: string
  disabled?: boolean
  /** Called after an upload, and when a version's review moves on. */
  onReviewChange?: () => void
}

// What each review state means to the author. A rejection also lists what
// to fix (from the review's author feedback).
const STATUS_COPY: Record<string, string> = {
  PENDING: "Waiting for the AI security review.",
  NEEDS_REVIEW: "Passed the AI review — a Botcamp admin gives it a final check before it can be cloned.",
  APPROVED: "Approved — Condor can clone this version.",
  REJECTED: "Not approved. Fix what's listed below and upload a new version.",
}

// The AI review runs on its own schedule, so check back without hammering.
const POLL_MS = 60_000

// Upload and track the Condor agent package behind an AGENT strategy: the
// agent's folder, structure-checked on upload, then reviewed before Condor
// can clone it. Versions uploaded from GitHub before folders-only still list.
export function AgentPackageCard({
  initialVersions,
  strategyId,
  strategySlug,
  disabled,
  onReviewChange,
}: AgentPackageCardProps): React.JSX.Element {
  const [versions, setVersions] = useState<AgentVersion[] | null>(initialVersions)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<{ errors: Issue[]; warnings: Issue[] } | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const endpoint = `/api/user/strategies/${strategyId}/agent-versions`

  // Read-only preview: the versions come from the server; Botcamp loads them
  // from its API here and polls while one is in review.
  const load = useCallback(async () => {
    setVersions(initialVersions)
  }, [initialVersions])
  void POLL_MS
  void strategyId

  const pending = versions?.some((v) => v.status === "PENDING")

  // Tell the page when the newest version's review moves on (or a new one
  // lands), so whatever shows the agent's state can follow it.
  const latestState = versions?.[0] ? `${versions[0].version}:${versions[0].status}` : null
  const seenState = useRef<string | null>(null)
  useEffect(() => {
    if (latestState === null) return
    if (seenState.current !== null && seenState.current !== latestState) onReviewChange?.()
    seenState.current = latestState
  }, [latestState, onReviewChange])

  const upload = async (init: RequestInit) => {
    setBusy(true)
    setError(null)
    setIssues(null)
    try {
      const res = await fetch(endpoint, { method: "POST", ...init })
      const body = await res.json()
      if (res.status === 422) {
        setIssues({ errors: body.errors ?? [], warnings: body.warnings ?? [] })
        return
      }
      if (!res.ok) throw new Error(body.error || "Upload failed")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  // The agent folder, picked or dropped, zipped here and uploaded as one file.
  const uploadFolder = async (files: FolderFile[] | null) => {
    setError(null)
    setIssues(null)
    if (files === null) {
      setError("Drop the agent's folder itself — not a zip or a single file")
      return
    }
    if (files.length === 0) {
      setError("That folder is empty")
      return
    }
    try {
      const zip = await zipFolder(files)
      const form = new FormData()
      form.append("file", zip, `${folderName(files)}.zip`)
      await upload({ body: form })
    } catch (err) {
      setError(err instanceof FolderTooLargeError ? err.message : "Couldn't read that folder")
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  const latestApproved = versions?.find((v) => v.status === "APPROVED")
  // Condor's Hub (Pull agents → Look up by slug) addresses an agent by slug.
  const cloneCommand = latestApproved
    ? strategySlug
    : null

  const copyCommand = async () => {
    if (!cloneCommand) return
    await navigator.clipboard.writeText(cloneCommand)
    setCopied(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-secondary" />
          Condor Agent Package
        </CardTitle>
        <CardDescription>
          Each version is checked and reviewed before Condor can clone it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-6">
        {!disabled && <AgentPackageGuide />}
        {!disabled && (
          <div className="space-y-bc-3">
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              // Picks a whole folder; the browser gives every file with its path.
              {...{ webkitdirectory: "", directory: "" }}
              multiple
              onChange={(e) => e.target.files && uploadFolder(filesFromFolderInput(e.target.files))}
            />
            <ReadOnlyHint block>
            <button
              type="button"
              disabled
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                if (busy || pending) return
                filesFromDrop(e.dataTransfer)
                  .then(uploadFolder)
                  .catch((err) => setError(err instanceof Error ? err.message : "Couldn't read that folder"))
              }}
              className={cn(
                "flex w-full flex-col items-center gap-1.5 rounded-bc-lg border border-dashed px-6 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-medium">Drop the agent&apos;s folder here, or click to choose it</span>
            </button>
            </ReadOnlyHint>
            <p className="text-xs text-muted-foreground">
              {pending
                ? "You can upload again once the version in review is decided."
                : "Each upload is a new version. Up to 4MB once zipped, up to 5 versions a day."}
            </p>
          </div>
        )}

        {error && <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>{error}</p>}

        {issues && (
          <div className={cn("space-y-bc-2 rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>
            <p className="font-medium">The package wasn&apos;t accepted — fix these and upload again:</p>
            <ul className="list-disc space-y-bc-1 pl-5">
              {issues.errors.map((issue, i) => (
                <li key={i}>
                  {issue.path && <span className="font-mono text-xs">{issue.path}: </span>}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {cloneCommand && (
          <div className="space-y-bc-2">
            <p className="text-sm">
              Anyone can clone v{latestApproved?.version} in Condor from Hub → Pull agents, or with this slug
              under Look up by slug:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">{cloneCommand}</code>
              <Button type="button" variant="outline" size="icon" onClick={copyCommand} aria-label="Copy slug">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {versions === null && !error && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {versions && versions.length === 0 && (
          <p className="text-sm text-muted-foreground">No versions uploaded yet.</p>
        )}
        {versions && versions.length > 0 && (
          <ul className="divide-y divide-border rounded-bc-md border">
            {versions.map((v) => (
              <li key={v.id} className="space-y-bc-1 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">v{v.version}</span>
                  <AgentVersionStatusBadge status={v.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(v.createdAt)} · {v.fileCount} files ·{" "}
                    {v.source === "GITHUB" && v.sourceRef
                      ? `GitHub @ ${v.sourceRef.slice(0, 7)}`
                      : v.source === "CONDOR"
                        ? "from Condor"
                        : "zip"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{STATUS_COPY[v.status]}</p>
                {v.reviewNote && <p className="text-sm">Reviewer note: {v.reviewNote}</p>}
                {v.feedback.length > 0 && (
                  <ul className={cn("space-y-bc-1 rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>
                    {v.feedback.map((f, i) => (
                      <li key={i}>
                        {f.path && <span className="font-mono text-xs">{f.path}: </span>}
                        {f.message}
                      </li>
                    ))}
                  </ul>
                )}
                {v.warnings.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                    {v.warnings.map((w, i) => (
                      <li key={i}>
                        {w.path && <span className="font-mono">{w.path}: </span>}
                        {w.message}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
