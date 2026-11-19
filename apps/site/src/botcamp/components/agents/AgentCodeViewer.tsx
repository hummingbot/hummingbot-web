"use client"

import { useCallback, useEffect, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { BadgeCheck, Check, Copy, FileCode, Loader2 } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { alertColors } from "@/botcamp/lib/design-constants"
import { formatFileSize } from "@/botcamp/lib/format"
import { cn } from "@/botcamp/lib/utils"

interface PackageFile {
  path: string
  size: number
}

const LANGUAGES: Record<string, string> = {
  py: "python",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  json: "json",
  sh: "bash",
  txt: "text",
}

function language(path: string): string {
  return LANGUAGES[path.split(".").pop()?.toLowerCase() ?? ""] ?? "text"
}

// AGENT.md first, then the rest in path order: where a reader starts.
function byReadingOrder(a: PackageFile, b: PackageFile): number {
  if (a.path === "AGENT.md") return -1
  if (b.path === "AGENT.md") return 1
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0
}

/**
 * An agent's code on its page: the files of its newest approved version, the
 * one Condor clones (GET /api/strategies/[slug]/agent-code). A version still
 * in review never shows here.
 */
export function AgentCodeViewer({ strategySlug }: { strategySlug: string }): React.JSX.Element {
  const endpoint = `/api/strategies/${strategySlug}/agent-code`
  const [listing, setListing] = useState<{ version: number; files: PackageFile[] } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(endpoint)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || "Couldn't load the agent's code")
        if (cancelled) return
        const files = [...body.data.files].sort(byReadingOrder)
        setListing({ version: body.data.version, files })
        setSelected(files[0]?.path ?? null)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load the agent's code"))
    return () => {
      cancelled = true
    }
  }, [endpoint])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setLoadingFile(true)
    setContent(null)
    fetch(`${endpoint}?path=${encodeURIComponent(selected)}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || "Couldn't load the file")
        if (!cancelled) setContent(body.data.content)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load the file"))
      .finally(() => !cancelled && setLoadingFile(false))
    return () => {
      cancelled = true
    }
  }, [endpoint, selected])

  const copy = useCallback(async () => {
    if (content === null) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  if (error) return <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>{error}</p>
  if (!listing) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />

  return (
    <div className="space-y-bc-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <BadgeCheck className="h-4 w-4 text-condor-gold-deep dark:text-condor-gold" />
        Version {listing.version}, as reviewed: exactly what Condor clones.
      </p>

      <div className="grid overflow-hidden rounded-bc-lg border border-border md:grid-cols-[260px_1fr]">
        <ul className="max-h-[560px] overflow-y-auto border-b border-border bg-muted/30 py-1 md:border-b-0 md:border-r">
          {listing.files.map((file) => (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => setSelected(file.path)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs transition-colors",
                  file.path === selected
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <FileCode className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate" title={file.path}>
                  {file.path}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <span className="min-w-0 truncate font-mono text-xs">{selected}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {formatFileSize(listing.files.find((f) => f.path === selected)?.size ?? 0)}
              <Button type="button" variant="ghost" size="sm" onClick={copy} disabled={content === null}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </span>
          </div>
          {loadingFile || content === null ? (
            <div className="p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SyntaxHighlighter
              language={language(selected ?? "")}
              style={oneDark}
              customStyle={{ margin: 0, borderRadius: 0, maxHeight: 560, fontSize: 12 }}
              showLineNumbers
            >
              {content}
            </SyntaxHighlighter>
          )}
        </div>
      </div>
    </div>
  )
}
