"use client"

import { useState } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Pencil, Check, X, Loader2 } from "lucide-react"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface EditableAgentIdeaProps {
  hackathonSlug: string
  initialDescription: string
  /** Registration has closed — the idea is shown read-only. */
  locked?: boolean
}

export function EditableAgentIdea({
  hackathonSlug,
  initialDescription,
  locked = false,
}: EditableAgentIdeaProps) {
  const [description, setDescription] = useState(initialDescription)
  const [draft, setDraft] = useState(initialDescription)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEditing = () => {
    setDraft(description)
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    setError(null)
    setEditing(false)
  }

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/hackathons/${hackathonSlug}/register`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentDescription: draft.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update")
      }
      setDescription(draft.trim())
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="space-y-bc-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          disabled={saving}
          className="text-sm"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <ReadOnlyHint><Button size="sm" onClick={save} disabled>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1" />
            )}
            Save
          </Button></ReadOnlyHint>
          <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-bc-3">
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {description ||
          (locked ? "No description added." : "Tell teams what you're building — your strategy, markets, and edge.")}
      </p>
      {locked ? (
        <p className="text-xs text-muted-foreground">Locked — registration has closed.</p>
      ) : (
        <ReadOnlyHint><Button size="sm" variant="outline" onClick={startEditing} disabled>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button></ReadOnlyHint>
      )}
    </div>
  )
}
