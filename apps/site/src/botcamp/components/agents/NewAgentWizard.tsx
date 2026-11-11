"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CircleCheck, FolderOpen, Loader2, Upload, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { TagInput } from "@/botcamp/components/ui/tag-input"
import { AgentPackageGuide } from "@/botcamp/components/agents/AgentPackageGuide"
import { AgentPackageReport, type AgentPackageCheck } from "@/botcamp/components/agents/AgentPackageReport"
import {
  FolderTooLargeError,
  filesFromDrop,
  filesFromFolderInput,
  folderName,
  zipFolder,
  type FolderFile,
} from "@/botcamp/lib/agent-folder-zip"
import { alertColors } from "@/botcamp/lib/design-constants"
import { MAX_SUMMARY_LENGTH, MAX_TITLE_LENGTH } from "@/botcamp/lib/strategy-input"
import { youtubeVideoId } from "@/botcamp/lib/video-embed"
import { cn } from "@/botcamp/lib/utils"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

// The agent folder the author picked, zipped in the browser for the upload.
type PackageSource = { name: string; fileCount: number; zip: Blob }

const STEPS = ["Package", "Details", "Submit"] as const

// Mirrors MAX_ZIP_BYTES in src/lib/agent-upload.ts (a server-only module).
const MAX_ZIP_MB = 4

// The request body for a package, for both the check and the upload: the
// same zip both times, so what's stored is exactly what was checked.
function packageRequest(source: PackageSource): RequestInit {
  const form = new FormData()
  form.append("file", source.zip, `${source.name}.zip`)
  return { body: form }
}

/**
 * Sharing a Condor agent in three steps: check the package (what Condor will
 * install, what has to be fixed), fill in the page details from its AGENT.md,
 * then create the agent and its first version, which goes to review.
 */
export function NewAgentWizard({
  initialTitle = "",
  initialSummary = "",
  strategyOptions,
}: {
  /** What was already typed, when the flow opens from the strategy form. */
  initialTitle?: string
  initialSummary?: string
  /** Read-only preview: the tag/exchange vocabulary, read on the server (Botcamp fetches it). */
  strategyOptions: { tags: string[]; exchanges: string[] }
}): React.JSX.Element {
  const [step, setStep] = useState(0)

  const [source, setSource] = useState<PackageSource | null>(null)
  const [check, setCheck] = useState<AgentPackageCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(initialTitle)
  const [summary, setSummary] = useState(initialSummary)
  const [videoURL, setVideoURL] = useState("")
  const [exchanges, setExchanges] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  // The same vocabulary as the strategy editor: existing tags and exchanges only.
  const [options] = useState<{ tags: string[]; exchanges: string[] }>(strategyOptions)

  const [submitting, setSubmitting] = useState(false)
  // Set when the page was created but its first version wasn't: the author
  // finishes the upload from the agent's page.
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ id: number; version: number } | null>(null)

  const runCheck = async (next: PackageSource) => {
    setSource(next)
    setCheck(null)
    setError(null)
    setChecking(true)
    try {
      const res = await fetch("/api/user/agent-packages/check", { method: "POST", ...packageRequest(next) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Couldn't read the package")
      const result = body.data as AgentPackageCheck
      setCheck(result)
      // Prefill the page from AGENT.md, without overwriting what was typed.
      if (result.ok) {
        setTitle((current) => current || (result.manifest?.name ?? "").slice(0, MAX_TITLE_LENGTH))
        setSummary((current) => current || (result.description ?? "").slice(0, MAX_SUMMARY_LENGTH))
        setExchanges((current) => (current.length > 0 ? current : (result.exchanges ?? [])))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read the package")
    } finally {
      setChecking(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  // A picked or dropped folder: zipped here, then checked.
  const pickFolder = async (files: FolderFile[] | null) => {
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
      if (zip.size > MAX_ZIP_MB * 1024 * 1024) {
        setError(`The agent folder is over ${MAX_ZIP_MB}MB once zipped — leave out anything Condor doesn't need`)
        return
      }
      runCheck({ name: folderName(files), fileCount: files.length, zip })
    } catch (err) {
      setError(err instanceof FolderTooLargeError ? err.message : "Couldn't read that folder")
    } finally {
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  const clearPackage = () => {
    setSource(null)
    setCheck(null)
    setError(null)
  }

  const submit = async () => {
    if (!source) return
    setSubmitting(true)
    setError(null)
    try {
      let id = createdId
      if (id === null) {
        const res = await fetch("/api/user/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            summary: summary.trim(),
            videoURL: videoURL.trim() || null,
            tags,
            exchanges,
            strategyType: "AGENT",
          }),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || "Couldn't create the agent")
        id = body.id as number
        setCreatedId(id)
      }

      const res = await fetch(`/api/user/strategies/${id}/agent-versions`, {
        method: "POST",
        ...packageRequest(source),
      })
      const body = await res.json()
      if (!res.ok) {
        // A page with no package is an empty draft, and a draft counts against
        // the one-unfinished-draft cap — so it goes again, and a retry creates
        // it afresh from the form as it is then.
        const removed = await fetch(`/api/user/strategies/${id}`, { method: "DELETE" })
          .then((r) => r.ok)
          .catch(() => false)
        if (removed) setCreatedId(null)
        throw new Error(body.error || "The agent's package didn't upload")
      }
      // Stay in the flow and say what happens next, rather than drop the
      // author into the strategy editor, whose own checklist and Submit for
      // Review read as if the agent still had to be sent.
      setSubmitted({ id: id as number, version: body.data.version as number })
      setSubmitting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  // Videos are YouTube links only (the API enforces it too).
  const videoValid = !videoURL.trim() || youtubeVideoId(videoURL.trim()) !== null
  const detailsValid = title.trim().length > 0 && summary.trim().length > 0 && videoValid

  if (submitted) {
    return (
      <Card>
        <CardContent className="space-y-bc-6 py-10">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CircleCheck className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">{title.trim()} is in review</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Version {submitted.version} was submitted. Nothing else is needed from you: you&apos;ll get an email as it
              moves through review.
            </p>
          </div>

          <ol className="mx-auto grid max-w-xl gap-px overflow-hidden rounded-bc-md border border-border bg-border text-sm sm:grid-cols-3">
            {[
              ["AI review", "Checks the package for safety. If it finds problems, you'll see what to fix."],
              ["Admin check", "A Botcamp admin gives it a final look and approves it."],
              ["Condor Ready", "Once its page is public, anyone can clone it from Condor's Hub."],
            ].map(([label, body], i) => (
              <li key={label} className="bg-card p-4">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 font-medium">{label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href={`/dashboard/strategies/${submitted.id}`}>Follow the Review</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/strategies">Go to My Strategies</Link>
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            The agent&apos;s page is private while it&apos;s reviewed. You can add a longer description to it
            meanwhile.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-bc-6">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs",
                i === step
                  ? "border-primary bg-primary/10 text-foreground"
                  : i < step
                    ? "border-primary/40 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span className={cn(i === step ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload the Agent Package</CardTitle>
            <CardDescription>
              It&apos;s checked right away, before anything is created, so you can fix it first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-bc-6">
            <AgentPackageGuide />

            {/* Always mounted, so "upload the fixed folder" can open it too. */}
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              // Picks a whole folder; the browser gives every file with its path.
              {...{ webkitdirectory: "", directory: "" }}
              multiple
              onChange={(e) => e.target.files && pickFolder(filesFromFolderInput(e.target.files))}
            />

            {!source ? (
              <div className="space-y-bc-4">
                <ReadOnlyHint block><button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    // Read-only preview: no package is read or checked.
                    if (e.currentTarget.disabled) return
                    filesFromDrop(e.dataTransfer)
                      .then(pickFolder)
                      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't read that folder"))
                  }}
                  className={cn(
                    "flex w-full flex-col items-center gap-2 rounded-bc-lg border border-dashed px-6 py-10 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  )}
                  disabled>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Drop the agent&apos;s folder here, or click to choose it</span>
                  <span className="text-xs text-muted-foreground">
                    The folder with AGENT.md in it. Up to {MAX_ZIP_MB}MB once zipped.
                  </span>
                </button></ReadOnlyHint>

              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-bc-md border border-border px-4 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-xs">
                    {source.name}/ · {source.fileCount} {source.fileCount === 1 ? "file" : "files"}
                  </span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={clearPackage} disabled={checking}>
                  <X className="mr-1 h-4 w-4" />
                  Change
                </Button>
              </div>
            )}

            {checking && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking the package…
              </p>
            )}
            {error && <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>{error}</p>}
            {check && <AgentPackageReport check={check} />}

            {check && !check.ok && source && (
              <p className="text-sm text-muted-foreground">
                Fix the files marked above, then{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() => {
                    clearPackage()
                    fileInput.current?.click()
                  }}
                >
                  upload the fixed folder
                </button>
                .
              </p>
            )}

            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep(1)} disabled={!check?.ok || checking}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>The Agent&apos;s Page</CardTitle>
            <CardDescription>
              Filled in from your package. You can add a longer description later from the editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-bc-5">
            <div className="space-y-bc-2">
              <Label htmlFor="agent-title">Name</Label>
              <Input
                id="agent-title"
                value={title}
                maxLength={MAX_TITLE_LENGTH}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="agent-summary">Summary</Label>
              <Textarea
                id="agent-summary"
                value={summary}
                maxLength={MAX_SUMMARY_LENGTH}
                rows={4}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="What it trades, where, and how it decides."
              />
              <p className="text-xs text-muted-foreground">Shown on the agent&apos;s card and in Condor&apos;s Hub.</p>
            </div>
            <div className="space-y-bc-2">
              <Label>Exchanges</Label>
              <TagInput
                value={exchanges}
                onChange={setExchanges}
                suggestions={options.exchanges}
                placeholder="Select exchanges..."
                allowCreate={false}
              />
              <p className="text-xs text-muted-foreground">
                {check?.exchanges && check.exchanges.length > 0
                  ? "Filled in from the connectors in your package. Their logos show on the agent's card."
                  : "Where it trades. Their logos show on the agent's card."}
              </p>
            </div>
            <div className="space-y-bc-2">
              <Label>
                Tags <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <TagInput
                value={tags}
                onChange={setTags}
                suggestions={options.tags}
                placeholder="Select tags..."
                allowCreate={false}
              />
              <p className="text-xs text-muted-foreground">What kind of strategy it is, e.g. LP or Market Making.</p>
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="agent-video">
                Demo Video <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="agent-video"
                value={videoURL}
                onChange={(e) => setVideoURL(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                aria-invalid={!videoValid}
              />
              <p className={cn("text-xs", videoValid ? "text-muted-foreground" : "text-destructive")}>
                {videoValid ? "A YouTube link." : "Use a YouTube link — other video hosts aren't supported."}
              </p>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="button" onClick={() => setStep(2)} disabled={!detailsValid}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && check?.ok && source && (
        <Card>
          <CardHeader>
            <CardTitle>Submit for Review</CardTitle>
            <CardDescription>
              An AI review checks the package for safety, then a Botcamp admin gives it a final look before it
              can be cloned from Condor&apos;s Hub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-bc-5">
            <dl className="grid gap-px overflow-hidden rounded-bc-md border border-border bg-border text-sm sm:grid-cols-2">
              <Summary label="Name" value={title.trim()} />
              <Summary label="Exchanges" value={exchanges.join(", ") || "—"} />
              <Summary label="Tags" value={tags.join(", ") || "—"} />
              <Summary
                label="Package"
                value={`${check.tree.filter((e) => !e.leftOut).length} files · ${
                  `${source.name}/`
                }`}
              />
              <div className="bg-card px-4 py-3 sm:col-span-2">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Summary</dt>
                <dd className="mt-1 whitespace-pre-line">{summary.trim()}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              The agent&apos;s page starts private. You can follow the review and edit the page from My
              Strategies.
            </p>

            {error && (
              <div className={cn("space-y-bc-2 rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>
                <p>{error}</p>
                {createdId !== null && (
                  <p>
                    The agent&apos;s page was created —{" "}
                    <Link href={`/dashboard/strategies/${createdId}`} className="font-medium underline underline-offset-4">
                      open it to upload the package from there
                    </Link>
                    , or try again.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <ReadOnlyHint><Button type="button" onClick={submit} disabled>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {createdId !== null ? "Try the Upload Again" : "Submit for Review"}
              </Button></ReadOnlyHint>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0 bg-card px-4 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate">{value}</dd>
    </div>
  )
}
