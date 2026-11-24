"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/botcamp/components/ui/dialog"

export interface CreatedTeam {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  logoUrlDark: string | null
}

interface AddTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Saved hackathon to attach the team to; null while the hackathon is still new. */
  hackathonId: string | null
  onCreated: (team: CreatedTeam) => void
}

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

/**
 * Creates a real Team record from the hackathon editor. Only the essentials
 * are asked here — logos, rules and resources live in the full TeamEditor.
 */
export function AddTeamDialog({ open, onOpenChange, hackathonId, onCreated }: AddTeamDialogProps) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName("")
    setSlug("")
    setSlugEdited(false)
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (isSaving) return
    if (!next) reset()
    onOpenChange(next)
  }

  const handleCreate = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          hackathonId: hackathonId ?? undefined,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || "Failed to create team")
      const team = json.data as CreatedTeam
      onCreated({
        id: team.id,
        name: team.name,
        slug: team.slug,
        logoUrl: team.logoUrl,
        logoUrlDark: team.logoUrlDark,
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team")
    } finally {
      setIsSaving(false)
    }
  }

  const canCreate = name.trim() !== "" && slug.trim() !== "" && !isSaving

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team</DialogTitle>
          <DialogDescription>
            {hackathonId
              ? "Creates the sponsor team and adds it to this hackathon."
              : "Creates the sponsor team and selects it — it joins the hackathon when you create it."}{" "}
            Add its logos, colors, rules, and resources from the team page afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-bc-4">
          <div className="space-y-bc-2">
            <Label htmlFor="new-team-name">Name</Label>
            <Input
              id="new-team-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!slugEdited) setSlug(toSlug(e.target.value))
              }}
              placeholder="e.g. Hyperliquid"
              autoFocus
            />
          </div>
          <div className="space-y-bc-2">
            <Label htmlFor="new-team-slug">Slug</Label>
            <Input
              id="new-team-slug"
              value={slug}
              onChange={(e) => {
                setSlug(toSlug(e.target.value))
                setSlugEdited(true)
              }}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Used in the team page URL.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
