"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Check, X, Loader2, ArrowRight, Settings, MapPin } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { LocationInput } from "@/botcamp/components/ui/location-input"
import { SponsorSelect, type SponsorOption } from "./SponsorSelect"
import { SponsorBadge } from "./SponsorBadge"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface RegistrationProfileCardProps {
  firstName: string | null
  lastName: string | null
  tagline: string | null
  location: string | null
  avatarUrl: string | null
  hackathonSlug: string
  sponsorTeamId: string | null
  teams: SponsorOption[]
  /** Registration has closed — the sponsor pick is shown read-only. */
  sponsorLocked?: boolean
}

/**
 * Compact, inline-editable view of the builder's public identity — the
 * name + tagline that surface on their showcase card. Name/tagline edit
 * in place via /api/users/me; avatar, socials, and bio live in the full
 * profile editor.
 */
export function RegistrationProfileCard({
  firstName,
  lastName,
  tagline,
  location,
  avatarUrl,
  hackathonSlug,
  sponsorTeamId,
  teams,
  sponsorLocked = false,
}: RegistrationProfileCardProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [first, setFirst] = useState(firstName ?? "")
  const [last, setLast] = useState(lastName ?? "")
  const [tag, setTag] = useState(tagline ?? "")
  const [loc, setLoc] = useState(location ?? "")

  // Sponsor selection — persisted to the hackathon entry via the register PATCH.
  const [sponsorId, setSponsorId] = useState<string | null>(sponsorTeamId)
  const [sponsorDraft, setSponsorDraft] = useState<string | null>(sponsorTeamId)
  const [sponsorEditing, setSponsorEditing] = useState(false)
  const [sponsorSaving, setSponsorSaving] = useState(false)
  const [sponsorError, setSponsorError] = useState<string | null>(null)
  const currentSponsor = teams.find((t) => t.id === sponsorId) ?? null

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Add your name"

  const saveSponsor = async () => {
    setSponsorError(null)
    setSponsorSaving(true)
    try {
      const res = await fetch(`/api/hackathons/${hackathonSlug}/register`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorTeamId: sponsorDraft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update sponsor")
      setSponsorId(sponsorDraft)
      setSponsorEditing(false)
      router.refresh()
    } catch (err) {
      setSponsorError(err instanceof Error ? err.message : "Failed to update sponsor")
    } finally {
      setSponsorSaving(false)
    }
  }

  const save = async () => {
    setError(null)
    if (!first.trim() || !last.trim()) {
      setError("First and last name are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: first.trim(),
          lastName: last.trim(),
          tagline: tag.trim(),
          location: loc.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="space-y-bc-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="First name"
            disabled={saving}
          />
          <Input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder="Last name"
            disabled={saving}
          />
        </div>
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Tagline — e.g. ex-commodities trader building Margarita Finance"
          disabled={saving}
        />
        <LocationInput value={loc} onChange={setLoc} disabled={saving} />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <ReadOnlyHint><Button size="sm" onClick={save} disabled>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
            Save
          </Button></ReadOnlyHint>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setError(null) }} disabled={saving}>
            <X className="mr-1 h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-bc-4">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border text-lg font-bold text-black"
            style={getAvatarGradient(displayName)}
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {tagline || "Add a tagline so teams know who you are"}
          </p>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {location}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ReadOnlyHint><Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit name & tagline
        </Button></ReadOnlyHint>
        <Button size="sm" variant="ghost" asChild>
          <Link href="/dashboard/profile">
            <Settings className="mr-1 h-3.5 w-3.5" />
            Full profile
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {teams.length > 0 && (
        <div className="border-t border-border pt-3">
          {/* The sponsor picked at sign-up — a preference, not a team's selection. */}
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {sponsorLocked ? "Preferred team" : "Racing for"}
          </p>
          {sponsorEditing ? (
            <div className="space-y-bc-2">
              <SponsorSelect
                teams={teams}
                value={sponsorDraft}
                onChange={setSponsorDraft}
                disabled={sponsorSaving}
              />
              {sponsorError && <p className="text-xs text-destructive">{sponsorError}</p>}
              <div className="flex gap-2">
                <ReadOnlyHint><Button size="sm" onClick={saveSponsor} disabled>
                  {sponsorSaving ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-3.5 w-3.5" />
                  )}
                  Save
                </Button></ReadOnlyHint>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSponsorDraft(sponsorId)
                    setSponsorError(null)
                    setSponsorEditing(false)
                  }}
                  disabled={sponsorSaving}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {currentSponsor ? (
                <SponsorBadge
                  sponsor={{
                    name: currentSponsor.name,
                    logoUrl: currentSponsor.logoUrl,
                    logoUrlDark: currentSponsor.logoUrlDark,
                  }}
                />
              ) : (
                <span className="text-sm text-muted-foreground">No sponsor selected</span>
              )}
              {!sponsorLocked && (
                <ReadOnlyHint><Button size="sm" variant="ghost" onClick={() => setSponsorEditing(true)} disabled>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  {currentSponsor ? "Change" : "Choose sponsor"}
                </Button></ReadOnlyHint>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
