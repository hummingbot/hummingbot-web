"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Loader2, CheckCircle2, Eye, Upload, X, AlertTriangle } from "lucide-react"
import { useFormData } from "@/botcamp/hooks"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { TeamPreviewDialog } from "@/botcamp/components/teams/TeamPreviewDialog"
import { cn } from "@/botcamp/lib/utils"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

const PRESET_COLORS = [
  "#FF6A1A",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
]

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB

function validateLogoFile(file: File): string | null {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: PNG, JPG, JPEG, SVG"
  }
  if (file.size > MAX_LOGO_SIZE) {
    return "File too large. Maximum size is 2MB"
  }
  return null
}

/** JPGs can never have a transparent background. PNGs technically can carry
 * an alpha channel yet still be fully opaque, so sample the four corners —
 * if none of them are transparent the image almost certainly has a solid
 * fill that will show up as a block wherever the logo sits on a colored or
 * gradient surface (team hero, sponsor cards, etc). SVGs are skipped — most
 * are vector wordmarks without a canvas-checkable raster background. */
function checkLogoTransparency(file: File): Promise<boolean> {
  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    return Promise.resolve(false)
  }
  if (file.type === "image/svg+xml") {
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const cleanup = (result: boolean) => {
      URL.revokeObjectURL(url)
      resolve(result)
    }
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return cleanup(true)
        ctx.drawImage(img, 0, 0)
        const { width, height } = canvas
        const corners: [number, number][] = [
          [0, 0],
          [width - 1, 0],
          [0, height - 1],
          [width - 1, height - 1],
        ]
        const hasTransparentCorner = corners.some(
          ([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] < 250,
        )
        cleanup(hasTransparentCorner)
      } catch {
        // Canvas read can fail (e.g. tainted canvas) — fail open rather than
        // block the upload on an unrelated error.
        cleanup(true)
      }
    }
    img.onerror = () => cleanup(true)
    img.src = url
  })
}

/** Prefers the file's actual extension (what the user sees in their file
 * picker) and falls back to the MIME subtype if the name has none. */
function fileExtensionLabel(file: File): string {
  const match = /\.([a-z0-9]+)$/i.exec(file.name)
  return `.${(match?.[1] ?? file.type.split("/")[1] ?? "file").toLowerCase()}`
}

function transparencyWarning(file: File): string {
  const ext = fileExtensionLabel(file)
  return `This ${ext} file doesn't look like it has a transparent background — it may show up as a solid block instead of blending in wherever it's displayed.`
}

interface TeamInfo {
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  logoUrlDark: string | null
  websiteUrl: string | null
  rules: string | null
  resources: string | null
  primaryColor: string | null
}

/** Pending upload/delete state for one logo variant — staged locally and only
 * sent to the server when "Save Changes" is clicked, same as avatar uploads
 * elsewhere in the app. */
interface PendingLogo {
  file: File | null
  delete: boolean
  preview: string | null
}

const EMPTY_PENDING: PendingLogo = { file: null, delete: false, preview: null }

export function TeamInfoEditForm({
  team,
  publicUrl,
}: {
  team: TeamInfo
  /** Public-facing team page for this hackathon, if one exists — lets the team preview their changes. */
  publicUrl?: string
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showRulesPreview, setShowRulesPreview] = useState(false)
  const [showResourcesPreview, setShowResourcesPreview] = useState(false)
  const [pendingLogo, setPendingLogo] = useState<PendingLogo>(EMPTY_PENDING)
  const [pendingLogoDark, setPendingLogoDark] = useState<PendingLogo>(EMPTY_PENDING)
  const [logoWarning, setLogoWarning] = useState<string | null>(null)
  const [logoWarningDark, setLogoWarningDark] = useState<string | null>(null)
  // Bumped on every file selection per variant so a slow-resolving
  // transparency check for a since-replaced file can't overwrite the
  // warning for whatever file is actually selected now.
  const logoSelectionToken = useRef({ light: 0, dark: 0 })

  const { formData, handleChange, setField } = useFormData({
    name: team.name,
    description: team.description ?? "",
    logoUrl: team.logoUrl ?? "",
    logoUrlDark: team.logoUrlDark ?? "",
    rules: team.rules ?? "",
    resources: team.resources ?? "",
    primaryColor: team.primaryColor ?? "",
  })

  const hasPendingLogoChange = (pending: PendingLogo) => pending.file !== null || pending.delete

  const isDirty =
    formData.name !== team.name ||
    formData.description !== (team.description ?? "") ||
    formData.rules !== (team.rules ?? "") ||
    formData.resources !== (team.resources ?? "") ||
    formData.primaryColor !== (team.primaryColor ?? "") ||
    hasPendingLogoChange(pendingLogo) ||
    hasPendingLogoChange(pendingLogoDark)
  void isDirty // read-only preview: Save is always disabled

  const setLogoWarningFor = (dark: boolean, warning: string | null) => {
    if (dark) setLogoWarningDark(warning)
    else setLogoWarning(warning)
  }

  const handleLogoSelect = (dark: boolean) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateLogoFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ""
      return
    }

    setError(null)
    setLogoWarningFor(dark, null)
    const pending = { file, delete: false, preview: URL.createObjectURL(file) }
    if (dark) setPendingLogoDark(pending)
    else setPendingLogo(pending)
    e.target.value = ""

    const key = dark ? "dark" : "light"
    const token = ++logoSelectionToken.current[key]
    checkLogoTransparency(file).then((isTransparent) => {
      // A newer file was selected for this slot while this check was
      // in flight — its own check owns the warning now, so drop this one.
      if (logoSelectionToken.current[key] !== token) return
      setLogoWarningFor(dark, isTransparent ? null : transparencyWarning(file))
    })
  }

  const handleLogoRemove = (dark: boolean) => () => {
    const pending = { file: null, delete: true, preview: null }
    if (dark) setPendingLogoDark(pending)
    else setPendingLogo(pending)
    setLogoWarningFor(dark, null)
    // Invalidate any in-flight transparency check for this slot.
    logoSelectionToken.current[dark ? "dark" : "light"]++
  }

  const uploadPendingLogo = async (dark: boolean, pending: PendingLogo) => {
    const query = dark ? "?variant=dark" : ""
    if (pending.file) {
      const body = new FormData()
      body.append("file", pending.file)
      const response = await fetch(`/api/teams/${team.slug}/logo${query}`, {
        method: "POST",
        body,
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to upload logo")
      }
      const { data } = await response.json()
      setField(dark ? "logoUrlDark" : "logoUrl", data.logoUrl)
    } else if (pending.delete) {
      const response = await fetch(`/api/teams/${team.slug}/logo${query}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to remove logo")
      }
      setField(dark ? "logoUrlDark" : "logoUrl", "")
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)

    try {
      await uploadPendingLogo(false, pendingLogo)
      await uploadPendingLogo(true, pendingLogoDark)

      const response = await fetch(`/api/teams/${team.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          rules: formData.rules || null,
          resources: formData.resources || null,
          primaryColor: formData.primaryColor.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save team info")
      }

      setPendingLogo(EMPTY_PENDING)
      setPendingLogoDark(EMPTY_PENDING)
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-bc-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-bc-md border border-border bg-muted/40 px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Sponsor
          </span>
          <span className="text-sm font-semibold">{team.slug}</span>
        </div>
        <TeamPreviewDialog
          liveUrl={publicUrl}
          team={{
            name: formData.name,
            description: formData.description,
            logoUrl: pendingLogo.preview ?? (pendingLogo.delete ? "" : formData.logoUrl),
            logoUrlDark: pendingLogoDark.preview ?? (pendingLogoDark.delete ? "" : formData.logoUrlDark),
            primaryColor: formData.primaryColor,
            rules: formData.rules,
            resources: formData.resources,
          }}
          trigger={
            <Button variant="outline" size="sm">
              Preview Changes
              <Eye className="ml-2 h-3.5 w-3.5" />
            </Button>
          }
        />
      </div>
      <p className="text-xs text-muted-foreground">
        This sponsor identifier is fixed and always shown, even if you change the
        display name below.
      </p>

      <div className="space-y-bc-2">
        <Label htmlFor="name">Team Name</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} />
      </div>

      <div className="space-y-bc-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of your team..."
          rows={3}
        />
      </div>

      <div className="space-y-bc-2">
        <Label>Website URL</Label>
        <div className="rounded-bc-md border border-border bg-muted/40 px-3 py-2 text-sm">
          {team.websiteUrl ? (
            <a
              href={team.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {team.websiteUrl}
            </a>
          ) : (
            <span className="text-muted-foreground">Not set</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Only the Botcamp admin team can change the website URL.
        </p>
      </div>

      <div className="space-y-bc-4 rounded-bc-md border border-border p-4">
        <div>
          <p className="text-sm font-medium">Logo</p>
          <p className="text-xs text-muted-foreground">
            Provide both variants so your logo reads clearly on any background — a dark
            wordmark for light surfaces, and a light/white wordmark for dark surfaces.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LogoPicker
            label="Logo (light backgrounds)"
            previewBg="bg-[#f7f7f5]"
            placeholderClassName="text-muted-foreground/60"
            src={pendingLogo.preview ?? (pendingLogo.delete ? "" : formData.logoUrl)}
            onSelect={handleLogoSelect(false)}
            onRemove={handleLogoRemove(false)}
            inputId="logoUpload"
            warning={logoWarning}
          />

          <LogoPicker
            label="Logo (dark backgrounds)"
            previewBg="bg-black"
            placeholderClassName="text-white/40"
            src={pendingLogoDark.preview ?? (pendingLogoDark.delete ? "" : formData.logoUrlDark)}
            onSelect={handleLogoSelect(true)}
            onRemove={handleLogoRemove(true)}
            inputId="logoUploadDark"
            warning={logoWarningDark}
          />
        </div>
      </div>

      <div className="space-y-bc-2">
        <Label htmlFor="primaryColor">Brand Color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label="Brand color swatch"
            value={
              /^#[0-9a-fA-F]{6}$/.test(formData.primaryColor)
                ? formData.primaryColor
                : "#FF6A1A"
            }
            onChange={(e) => setField("primaryColor", e.target.value)}
            className="h-10 w-12 cursor-pointer rounded-bc-md border border-input bg-transparent p-1"
          />
          <Input
            id="primaryColor"
            name="primaryColor"
            value={formData.primaryColor}
            onChange={handleChange}
            placeholder="#FF6A1A"
            maxLength={9}
            className="max-w-[10rem] font-mono uppercase"
          />
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setField("primaryColor", color)}
              aria-label={`Use ${color}`}
              title={color}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                formData.primaryColor.toUpperCase() === color
                  ? "border-foreground"
                  : "border-transparent",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-bc-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="rules">Selection Rules (Markdown)</Label>
          <button
            type="button"
            onClick={() => setShowRulesPreview((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {showRulesPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showRulesPreview ? (
          <div className="min-h-[9rem] rounded-bc-md border border-input px-3 py-2">
            {formData.rules ? (
              <MarkdownContent content={formData.rules} className="prose-sm" />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <Textarea
            id="rules"
            name="rules"
            value={formData.rules}
            onChange={handleChange}
            placeholder="Selection criteria for agent applications..."
            rows={6}
          />
        )}
      </div>

      <div className="space-y-bc-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="resources">Build Resources (Markdown)</Label>
          <button
            type="button"
            onClick={() => setShowResourcesPreview((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {showResourcesPreview ? "Edit" : "Preview"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Docs, agent skills, connector guides — anything a builder needs to build for your team.
          Shown on your public team page.
        </p>
        {showResourcesPreview ? (
          <div className="min-h-[9rem] rounded-bc-md border border-input px-3 py-2">
            {formData.resources ? (
              <MarkdownContent content={formData.resources} className="prose-sm" />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <Textarea
            id="resources"
            name="resources"
            value={formData.resources}
            onChange={handleChange}
            placeholder="Links to docs, agent skills, connector guides..."
            rows={6}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <ReadOnlyHint><Button onClick={handleSave} disabled>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button></ReadOnlyHint>
        {saved && !isSaving && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  )
}

/** Preview box + upload/remove controls for one logo variant. Selecting a
 * file only stages it locally — it's uploaded when the form is saved. */
function LogoPicker({
  label,
  src,
  previewBg,
  placeholderClassName,
  onSelect,
  onRemove,
  inputId,
  warning,
}: {
  label: string
  src: string
  previewBg: string
  placeholderClassName: string
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  inputId: string
  warning?: string | null
}) {
  return (
    <div className="space-y-bc-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-bc-md border border-border",
            previewBg,
          )}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`${label} preview`} className="h-10 w-10 object-contain" />
          ) : (
            <span className={cn("text-[10px]", placeholderClassName)}>None</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={inputId} title="Read-only preview" className="cursor-not-allowed">
            <input
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              className="hidden"
              onChange={onSelect}
              disabled
            />
            <Button type="button" variant="outline" size="sm" className="pointer-events-none opacity-50" asChild>
              <span>
                <Upload className="mr-2 h-3.5 w-3.5" />
                {src ? "Change" : "Upload"}
              </span>
            </Button>
          </label>
          {src && (
            <ReadOnlyHint><Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled>
              <X className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button></ReadOnlyHint>
          )}
        </div>
      </div>
      {warning && (
        <p className="flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {warning}
        </p>
      )}
    </div>
  )
}
