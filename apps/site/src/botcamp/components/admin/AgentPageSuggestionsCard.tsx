"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send, Undo2 } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import {
  SUGGESTIBLE_FIELD_LABELS,
  type PageSuggestions,
  type SuggestibleField,
} from "@/botcamp/lib/agent-page-suggestions"
import { alertColors } from "@/botcamp/lib/design-constants"
import { formatDateTime } from "@/botcamp/lib/format"
import { MAX_SUMMARY_LENGTH, MAX_TITLE_LENGTH } from "@/botcamp/lib/strategy-input"
import { cn } from "@/botcamp/lib/utils"

interface AgentPageSuggestionsCardProps {
  strategyId: number
  current: Record<SuggestibleField, string | null>
  pending: PageSuggestions | null
}

/**
 * The agent page's text, next to the package being reviewed, where the admin
 * can suggest new wording. The author accepts or dismisses each field — the
 * page doesn't change until they do.
 */
export function AgentPageSuggestionsCard({ strategyId, current, pending }: AgentPageSuggestionsCardProps): React.JSX.Element {
  const router = useRouter()
  // The form starts from what's already suggested, else the page as it is.
  const initial = (field: SuggestibleField) => pending?.fields[field] ?? current[field] ?? ""
  const [fields, setFields] = useState({ title: initial("title"), summary: initial("summary"), details: initial("details") })
  const [note, setNote] = useState(pending?.note ?? "")
  const [busy, setBusy] = useState<"send" | "withdraw" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const changed = (Object.keys(fields) as SuggestibleField[]).filter(
    (field) => fields[field].trim() !== (current[field] ?? "").trim(),
  )

  const save = async (body: Record<string, string>, kind: "send" | "withdraw") => {
    setBusy(kind)
    setError(null)
    try {
      const res = await fetch(`/api/admin/strategies/${strategyId}/page-suggestions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      if (kind === "withdraw") {
        setFields({ title: current.title ?? "", summary: current.summary ?? "", details: current.details ?? "" })
        setNote("")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Page</CardTitle>
        <p className="text-sm text-muted-foreground">
          The page&apos;s text isn&apos;t part of the package. Edit any field to suggest new wording: the author is
          emailed and accepts or dismisses each change. Nothing on the page changes until they do.
        </p>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {pending && (
          <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.info)}>
            Suggested {pending.suggestedAt ? formatDateTime(pending.suggestedAt) : ""}, waiting on the author:{" "}
            {Object.keys(pending.fields)
              .map((f) => SUGGESTIBLE_FIELD_LABELS[f as SuggestibleField])
              .join(", ")}
            .
          </p>
        )}

        <div className="space-y-bc-2">
          <Label htmlFor="suggest-title">
            {SUGGESTIBLE_FIELD_LABELS.title}
            {changed.includes("title") && <ChangedMark />}
          </Label>
          <Input
            id="suggest-title"
            value={fields.title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(e) => setFields({ ...fields, title: e.target.value })}
          />
        </div>
        <div className="space-y-bc-2">
          <Label htmlFor="suggest-summary">
            {SUGGESTIBLE_FIELD_LABELS.summary}
            {changed.includes("summary") && <ChangedMark />}
          </Label>
          <Textarea
            id="suggest-summary"
            value={fields.summary}
            maxLength={MAX_SUMMARY_LENGTH}
            rows={3}
            onChange={(e) => setFields({ ...fields, summary: e.target.value })}
          />
        </div>
        <div className="space-y-bc-2">
          <Label htmlFor="suggest-details">
            {SUGGESTIBLE_FIELD_LABELS.details}
            {changed.includes("details") && <ChangedMark />}
          </Label>
          <Textarea
            id="suggest-details"
            value={fields.details}
            rows={6}
            className="font-mono text-xs"
            onChange={(e) => setFields({ ...fields, details: e.target.value })}
          />
        </div>
        <div className="space-y-bc-2">
          <Label htmlFor="suggest-note">Note to the author</Label>
          <Textarea
            id="suggest-note"
            value={note}
            rows={2}
            maxLength={2000}
            placeholder="Why these changes (optional)"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save({ ...fields, note }, "send")} disabled={!!busy || changed.length === 0}>
            {busy === "send" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {pending ? "Update Suggestions" : "Send Suggestions"}
          </Button>
          {pending && (
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() =>
                save({ title: current.title ?? "", summary: current.summary ?? "", details: current.details ?? "" }, "withdraw")
              }
            >
              {busy === "withdraw" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
              Withdraw
            </Button>
          )}
        </div>
        {error && <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>{error}</p>}
      </CardContent>
    </Card>
  )
}

function ChangedMark(): React.JSX.Element {
  return <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-primary">Suggested</span>
}
