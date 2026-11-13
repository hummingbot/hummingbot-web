"use client"

import { useState } from "react"
import { Check, Lightbulb, Loader2, X } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import {
  SUGGESTIBLE_FIELDS,
  SUGGESTIBLE_FIELD_LABELS,
  type PageSuggestions,
  type SuggestibleField,
} from "@/botcamp/lib/agent-page-suggestions"
import { alertColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface PageSuggestionsCardProps {
  strategyId: number
  suggestions: PageSuggestions
  current: Record<SuggestibleField, string>
  /** Puts an accepted field's new text in the form, which the page now holds too. */
  onAccepted: (field: SuggestibleField, value: string) => void
  /** Called once the last field is answered. */
  onDone: () => void
}

/**
 * A reviewer's suggested wording for the agent page, field by field next to
 * the author's own text. Accepting writes it to the page; dismissing keeps the
 * author's. Either way the field goes, and the card with the last one.
 */
export function PageSuggestionsCard({
  strategyId,
  suggestions,
  current,
  onAccepted,
  onDone,
}: PageSuggestionsCardProps): React.JSX.Element | null {
  const [remaining, setRemaining] = useState(
    SUGGESTIBLE_FIELDS.filter((field) => suggestions.fields[field] !== undefined),
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const answer = async (field: SuggestibleField, action: "accept" | "dismiss") => {
    setBusy(`${field}:${action}`)
    setError(null)
    try {
      const res = await fetch(`/api/user/strategies/${strategyId}/page-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, field }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Failed to update")
      if (action === "accept") onAccepted(field, body.data.value)
      const left = remaining.filter((f) => f !== field)
      setRemaining(left)
      if (left.length === 0) onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setBusy(null)
    }
  }

  if (remaining.length === 0) return null

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Suggested by the Review
        </CardTitle>
        <CardDescription>
          Botcamp&apos;s review suggested new wording for your agent&apos;s page. Accept a change to use it, or dismiss it
          to keep yours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {suggestions.note && (
          <p className="rounded-bc-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-medium">Reviewer note:</span> {suggestions.note}
          </p>
        )}

        {remaining.map((field) => (
          <div key={field} className="space-y-bc-2 rounded-bc-md border border-border p-4">
            <p className="text-sm font-medium">{SUGGESTIBLE_FIELD_LABELS[field]}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <TextBlock label="Yours" text={current[field]} muted />
              <TextBlock label="Suggested" text={suggestions.fields[field] ?? ""} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <ReadOnlyHint><Button size="sm" onClick={() => answer(field, "accept")} disabled>
                {busy === `${field}:accept` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Accept
              </Button></ReadOnlyHint>
              <ReadOnlyHint><Button size="sm" variant="outline" onClick={() => answer(field, "dismiss")} disabled>
                {busy === `${field}:dismiss` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                Keep Mine
              </Button></ReadOnlyHint>
            </div>
          </div>
        ))}

        {error && <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>{error}</p>}
      </CardContent>
    </Card>
  )
}

function TextBlock({ label, text, muted = false }: { label: string; text: string; muted?: boolean }): React.JSX.Element {
  return (
    <div className="min-w-0 space-y-bc-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-bc-md border border-border px-3 py-2 text-sm",
          muted ? "text-muted-foreground" : "border-primary/40 bg-primary/5",
        )}
      >
        {text || <span className="italic text-muted-foreground">(empty)</span>}
      </p>
    </div>
  )
}
