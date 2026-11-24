"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import Link from "next/link"
import { Plus, Trash2, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/botcamp/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/botcamp/components/ui/dialog"
import { EditorHeader } from "@/botcamp/components/admin/EditorHeader"
import { AddTeamDialog } from "@/botcamp/components/admin/AddTeamDialog"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { LessonTypeBadge } from "@/botcamp/components/ui/lesson-type-badge"
import { Badge } from "@/botcamp/components/ui/badge"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
import { Switch } from "@/botcamp/components/ui/switch"
import { formatDate } from "@/botcamp/lib/format"
import { DEFAULT_SLOTS_PER_SQUAD } from "@/botcamp/lib/hackathon-squads"
import { StagePreview } from "@/botcamp/components/admin/StagePreview"
import { HACKATHON_STAGES, STAGE_LABELS } from "@/botcamp/lib/hackathon-stages"
import { cn } from "@/botcamp/lib/utils"
import { GripVertical, Pencil, ClipboardList, Radio, ArrowUp, ArrowDown, RotateCcw, Database } from "lucide-react"
import {
  DEFAULT_FAQ,
  FAQ_TOKENS,
  FAQ_VISIBILITY_LABELS,
  parseFaq,
  type FaqItem,
  type FaqVisibility,
} from "@/botcamp/lib/hackathon-faq"
import {
  DEFAULT_STARTER_KIT,
  parseRaceHosts,
  resolveStarterKit,
  type RaceHost,
  type StarterKit,
} from "@/botcamp/lib/hackathon-starter-kit"
import { StarterKitEditor } from "@/botcamp/components/admin/StarterKitEditor"

interface HackathonSession {
  id: string
  title: string
  slug: string | null
  description: string | null
  type: string
  duration: number | null
  isFree: boolean
  videoId: string | null
  content: string | null
  date: string | null
  sortOrder: number
  teamId: string | null
}

interface ApplicationSummary {
  id: string
  teamPreferences: string[]
  selectedTeamId: string | null
  status: string
}

interface TeamOption {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  logoUrlDark: string | null
}

interface Hackathon {
  id: string
  slug: string
  title: string
  description: string | null
  rules: string | null
  status: string
  startDate: string
  endDate: string
  registrationStart: string | null
  registrationEnd: string | null
  raceStart: string | null
  raceEnd: string | null
  maxParticipants: number | null
  prizes: unknown
  finalViewers: number | null
  showcaseOnStrategies: boolean
  snapshotProposalId: string | null
  sessions: HackathonSession[]
  teamIds: string[]
  maxSelections: number
  faq: unknown
  starterKit: unknown
  raceHosts: unknown
  applications: ApplicationSummary[]
}

// <input type="datetime-local"> works in the browser's local time, while the
// API stores UTC instants — convert at the edges.
function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDateTimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

interface HackathonEditorProps {
  hackathon: Hackathon | null
  allTeams: TeamOption[]
}

export function HackathonEditor({ hackathon, allTeams }: HackathonEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate initial prize pool from prizes array
  const calculatePrizePool = (prizes: unknown): number => {
    if (!prizes || !Array.isArray(prizes)) return 0
    return prizes.reduce((sum, prize) => {
      if (!prize.amount) return sum
      const amount = parseFloat(String(prize.amount).replace(/[^0-9.]/g, ""))
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
  }

  // Hackathon form state
  const [formData, setFormData] = useState({
    slug: hackathon?.slug || "",
    title: hackathon?.title || "",
    description: hackathon?.description || "",
    rules: hackathon?.rules || "",
    status: hackathon?.status || "DRAFT",
    startDate: hackathon?.startDate
      ? new Date(hackathon.startDate).toISOString().split("T")[0]
      : "",
    endDate: hackathon?.endDate
      ? new Date(hackathon.endDate).toISOString().split("T")[0]
      : "",
    registrationStart: hackathon?.registrationStart
      ? new Date(hackathon.registrationStart).toISOString().split("T")[0]
      : "",
    registrationEnd: hackathon?.registrationEnd
      ? new Date(hackathon.registrationEnd).toISOString().split("T")[0]
      : "",
    raceStart: toLocalDateTimeInput(hackathon?.raceStart),
    raceEnd: toLocalDateTimeInput(hackathon?.raceEnd),
    maxParticipants: hackathon?.maxParticipants || null,
    prizePool: calculatePrizePool(hackathon?.prizes),
    maxSelections: hackathon?.maxSelections ?? DEFAULT_SLOTS_PER_SQUAD,
    finalViewers: hackathon?.finalViewers ?? null,
    showcaseOnStrategies: hackathon?.showcaseOnStrategies ?? false,
    snapshotProposalId: hackathon?.snapshotProposalId ?? "",
  })

  // FAQ: this edition's own items, or the default template until edited.
  const savedFaq = hackathon?.faq ? parseFaq(hackathon.faq) : null
  const [faqItems, setFaqItems] = useState<FaqItem[]>(
    savedFaq && "items" in savedFaq ? savedFaq.items : DEFAULT_FAQ.map((item) => ({ ...item }))
  )
  const [faqCustomized, setFaqCustomized] = useState(!!(savedFaq && "items" in savedFaq))
  // Only send the FAQ when it was touched, so an untouched template keeps
  // following DEFAULT_FAQ instead of freezing a copy of it.
  const [faqDirty, setFaqDirty] = useState(false)
  const updateFaq = (next: FaqItem[]) => {
    setFaqItems(next)
    setFaqCustomized(true)
    setFaqDirty(true)
  }
  const moveFaq = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= faqItems.length) return
    const next = [...faqItems]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateFaq(next)
  }
  const resetFaq = () => {
    setFaqItems(DEFAULT_FAQ.map((item) => ({ ...item })))
    setFaqCustomized(false)
    setFaqDirty(true)
  }

  // Starter kit: same pattern as the FAQ — the default until edited, and only
  // sent when touched so an untouched default keeps tracking the code.
  const savedKit = resolveStarterKit(hackathon?.starterKit)
  const [starterKit, setStarterKit] = useState<StarterKit>(savedKit.kit)
  const [kitCustomized, setKitCustomized] = useState(!savedKit.isDefault)
  const [kitDirty, setKitDirty] = useState(false)
  const updateKit = (next: StarterKit) => {
    setStarterKit(next)
    setKitCustomized(true)
    setKitDirty(true)
  }
  const resetKit = () => {
    setStarterKit(DEFAULT_STARTER_KIT)
    setKitCustomized(false)
    setKitDirty(true)
  }
  const savedHosts = hackathon?.raceHosts ? parseRaceHosts(hackathon.raceHosts) : null
  const [raceHosts, setRaceHosts] = useState<RaceHost[]>(
    savedHosts && "hosts" in savedHosts ? savedHosts.hosts : []
  )
  const [hostsDirty, setHostsDirty] = useState(false)

  // Selected team IDs
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    new Set(hackathon?.teamIds || [])
  )

  // Teams created from this editor show up before the refreshed allTeams does.
  const [createdTeams, setCreatedTeams] = useState<TeamOption[]>([])
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false)
  const teams = [...allTeams, ...createdTeams.filter((t) => !allTeams.some((a) => a.id === t.id))]
  const createdTeamIds = new Set(createdTeams.map((t) => t.id))

  // Count applications that have each team in their preferences (by team ID)
  const teamApplicationCounts: Record<string, number> = {}
  for (const app of hackathon?.applications || []) {
    for (const teamId of app.teamPreferences) {
      teamApplicationCounts[teamId] = (teamApplicationCounts[teamId] || 0) + 1
    }
  }

  // Count selected applications per team
  const teamSelectedCounts: Record<string, number> = {}
  for (const app of hackathon?.applications || []) {
    if (app.selectedTeamId) {
      teamSelectedCounts[app.selectedTeamId] = (teamSelectedCounts[app.selectedTeamId] || 0) + 1
    }
  }

  // Sessions state
  const [sessions, setSessions] = useState<HackathonSession[]>(
    hackathon?.sessions || []
  )

  // Session editing
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [sessionForm, setSessionForm] = useState<Partial<HackathonSession>>({})

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Session delete state
  const [showDeleteSessionDialog, setShowDeleteSessionDialog] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isDeletingSession, setIsDeletingSession] = useState(false)

  const isNew = !hackathon

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const handleSaveHackathon = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Convert prizePool number to prizes array
      const prizesJson = formData.prizePool > 0
        ? [{ place: 1, amount: `${formData.prizePool} USDT`, description: "Total Prize Pool" }]
        : null

      const payload = {
        slug: formData.slug,
        title: formData.title,
        description: formData.description || null,
        rules: formData.rules || null,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationStart: formData.registrationStart || null,
        // registrationEnd is the submission deadline, gated on
        // `now > registrationEnd`. Store the end of the picked day (not the
        // midnight a bare date parses to) so saving the editor never closes
        // submissions a day early, and date-only displays still show that day.
        registrationEnd: formData.registrationEnd ? `${formData.registrationEnd}T23:59:59.999Z` : null,
        raceStart: fromLocalDateTimeInput(formData.raceStart),
        raceEnd: fromLocalDateTimeInput(formData.raceEnd),
        maxParticipants: formData.maxParticipants,
        prizes: prizesJson,
        teamIds: Array.from(selectedTeamIds),
        maxSelections: formData.maxSelections,
        finalViewers: formData.finalViewers,
        showcaseOnStrategies: formData.showcaseOnStrategies,
        snapshotProposalId: formData.snapshotProposalId.trim() || null,
        // null puts the edition back on the default template.
        ...(faqDirty ? { faq: faqCustomized ? faqItems : null } : {}),
        ...(kitDirty ? { starterKit: kitCustomized ? starterKit : null } : {}),
        ...(hostsDirty ? { raceHosts } : {}),
      }

      const url = isNew
        ? "/api/admin/hackathons"
        : `/api/admin/hackathons/${hackathon.id}`
      const method = isNew ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save hackathon")
      }

      const { data } = await response.json()

      if (isNew) {
        router.push(`/admin/hackathons/${data.id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSession = async () => {
    if (!hackathon) return

    const nextSortOrder =
      sessions.length > 0
        ? Math.max(...sessions.map((s) => s.sortOrder)) + 1
        : 0

    try {
      const response = await fetch("/api/admin/hackathon-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathonId: hackathon.id,
          title: `Session ${sessions.length + 1}`,
          type: "VIDEO",
          isFree: true,
          sortOrder: nextSortOrder,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add session")
      }

      const { data } = await response.json()
      setSessions((prev) => [...prev, data])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleSaveSession = async () => {
    if (!editingSession) return

    try {
      const response = await fetch(
        `/api/admin/hackathon-sessions/${editingSession}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionForm),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save session")
      }

      const { data } = await response.json()
      setSessions((prev) =>
        prev.map((s) => (s.id === editingSession ? { ...s, ...data } : s))
      )
      setEditingSession(null)
      setSessionForm({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeleteSession = async () => {
    if (!deletingSessionId) return

    setIsDeletingSession(true)
    try {
      const response = await fetch(
        `/api/admin/hackathon-sessions/${deletingSessionId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete session")
      }

      setSessions((prev) => prev.filter((s) => s.id !== deletingSessionId))
      setShowDeleteSessionDialog(false)
      setDeletingSessionId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsDeletingSession(false)
    }
  }

  const handleDeleteHackathon = async () => {
    if (!hackathon) return

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/hackathons/${hackathon.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete hackathon")
      }

      router.push("/admin/hackathons")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete hackathon")
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-bc-6">
      <EditorHeader
        breadcrumb={[
          { label: "Hackathons", href: "/admin/hackathons" },
          { label: isNew ? "New Hackathon" : hackathon.title },
        ]}
        title={isNew ? "Create Hackathon" : `Edit: ${hackathon.title}`}
        subtitle={!isNew ? hackathon.slug : undefined}
        isNew={isNew}
        isLoading={isLoading}
        onSave={handleSaveHackathon}
        createLabel="Create Hackathon"
        error={error}
      />

      {!isNew && hackathon && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/hackathons/${hackathon.id}/race-feed`}>
              <Radio className="mr-2 h-4 w-4" />
              Race Feed
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/hackathons/${hackathon.id}/agent-data`}>
              <Database className="mr-2 h-4 w-4" />
              Agent Data
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/hackathons/${hackathon.id}/applications`}>
              <ClipboardList className="mr-2 h-4 w-4" />
              View Applications ({hackathon.applications.length})
            </Link>
          </Button>
        </div>
      )}

      {/* Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Stage
            {!isNew && formData.status !== hackathon.status && (
              <span className="font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-primary">
                Unsaved · live is {STAGE_LABELS[hackathon.status as keyof typeof STAGE_LABELS] ?? hackathon.status}
              </span>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Decides what the public pages show. Pick the stage, then Save.
          </p>
        </CardHeader>
        <CardContent className="space-y-bc-6">
          <div role="radiogroup" aria-label="Hackathon stage" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {HACKATHON_STAGES.map((stage, i) => {
              const selected = formData.status === stage.value
              return (
                <button
                  key={stage.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, status: stage.value }))
                    setError(null)
                  }}
                  className={cn(
                    "flex flex-col gap-1 rounded-bc-md border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-[0.14em]",
                      selected ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {String(i).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{stage.desc}</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="raceStart">Race Start (your local time)</Label>
              <Input
                id="raceStart"
                name="raceStart"
                type="datetime-local"
                value={formData.raceStart}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="raceEnd">Race End (your local time)</Label>
              <Input
                id="raceEnd"
                name="raceEnd"
                type="datetime-local"
                value={formData.raceEnd}
                onChange={handleChange}
              />
            </div>
          </div>
          {(formData.status === "COUNTDOWN" || formData.status === "ACTIVE") &&
            (!formData.raceStart || !formData.raceEnd) && (
              <p className="text-sm text-warning">
                The countdown and live race use Race Start and Race End — set both before
                switching to this stage.
              </p>
            )}

          {!isNew && formData.status !== "DRAFT" && (
            <div className="space-y-bc-1">
              <StagePreview hackathonSlug={hackathon.slug} stage={formData.status} />
              <p className="text-xs text-muted-foreground">
                Uses the saved dates and content — save first to preview unsaved edits.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hackathon Details */}
      <Card>
        <CardHeader>
          <CardTitle>Hackathon Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Trading Hackathon 2025"
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="e.g., trading-hackathon-2025"
              />
            </div>
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Hackathon description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="registrationStart">Registration Start</Label>
              <Input
                id="registrationStart"
                name="registrationStart"
                type="date"
                value={formData.registrationStart}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="registrationEnd">Registration End</Label>
              <Input
                id="registrationEnd"
                name="registrationEnd"
                type="date"
                value={formData.registrationEnd}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="startDate">Hackathon Start</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="endDate">Hackathon End</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="maxParticipants">Max Participants</Label>
            <Input
              id="maxParticipants"
              name="maxParticipants"
              type="number"
              value={formData.maxParticipants || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxParticipants: parseInt(e.target.value) || null,
                }))
              }
              className="max-w-[200px]"
            />
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="finalViewers">Final Viewers</Label>
            <Input
              id="finalViewers"
              name="finalViewers"
              type="number"
              placeholder="Fill in by hand after the event (YouTube/Twitch analytics)"
              value={formData.finalViewers ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  finalViewers: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              className="max-w-[280px]"
            />
          </div>

          <div className="space-y-bc-2">
            <div className="flex items-center gap-3">
              <Switch
                id="showcaseOnStrategies"
                checked={formData.showcaseOnStrategies}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, showcaseOnStrategies: checked }))
                }
              />
              <Label htmlFor="showcaseOnStrategies">Showcase results on /strategies</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Pins the raced agents to the top of /strategies in final-standings order, with the
              winner highlighted, and adds a filter chip for them. Shows once the race is scored.
            </p>
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="snapshotProposalId">HBOT Snapshot Proposal ID</Label>
            <Input
              id="snapshotProposalId"
              name="snapshotProposalId"
              placeholder="0x…"
              value={formData.snapshotProposalId}
              onChange={handleChange}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Proposal in hbot.eth where holders back the teams. It must use weighted voting, and its choices must
              each start with a team name (e.g. &quot;Gate agents: 7,8&quot;). Once set, the leaderboard scores the HBOT Vote from it.
            </p>
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="rules">Rules (Markdown)</Label>
            <Textarea
              id="rules"
              name="rules"
              value={formData.rules}
              onChange={handleChange}
              placeholder="Hackathon rules and guidelines..."
              rows={6}
            />
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="prizePool">Prize Pool (USD)</Label>
            <Input
              id="prizePool"
              name="prizePool"
              type="number"
              value={formData.prizePool || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  prizePool: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="e.g., 6000"
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Total prize pool amount in USD
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="space-y-bc-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>FAQ ({faqItems.length})</CardTitle>
            <div className="flex gap-2">
              {faqCustomized && (
                <Button type="button" variant="outline" size="sm" onClick={resetFaq}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to template
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => updateFaq([...faqItems, { q: "", a: "", show: "always" }])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add question
              </Button>
            </div>
          </div>
          {!faqCustomized && (
            <p className="rounded-bc-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
              Using the default template (Agent Builders Cup 2026). Review it for this edition — editing
              anything makes it this hackathon&apos;s own FAQ when you save.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Answers support markdown. These tokens fill in from this hackathon&apos;s data:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FAQ_TOKENS.map((t) => (
              <span
                key={t.token}
                title={t.description}
                className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]"
              >
                {t.token}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-bc-3">
          {faqItems.map((item, i) => (
            <div key={i} className="space-y-bc-2 rounded-bc-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                <Input
                  value={item.q}
                  onChange={(e) =>
                    updateFaq(faqItems.map((it, j) => (j === i ? { ...it, q: e.target.value } : it)))
                  }
                  placeholder="Question"
                  className="min-w-[16rem] flex-1"
                />
                <Select
                  value={item.show}
                  onValueChange={(value) =>
                    updateFaq(faqItems.map((it, j) => (j === i ? { ...it, show: value as FaqVisibility } : it)))
                  }
                >
                  <SelectTrigger className="w-[13rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FAQ_VISIBILITY_LABELS) as FaqVisibility[]).map((v) => (
                      <SelectItem key={v} value={v}>
                        {FAQ_VISIBILITY_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" onClick={() => moveFaq(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                  <span className="sr-only">Move up</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveFaq(i, 1)}
                  disabled={i === faqItems.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                  <span className="sr-only">Move down</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => updateFaq(faqItems.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete question</span>
                </Button>
              </div>
              <Textarea
                value={item.a}
                onChange={(e) =>
                  updateFaq(faqItems.map((it, j) => (j === i ? { ...it, a: e.target.value } : it)))
                }
                placeholder="Answer (markdown)"
                rows={3}
                className="text-sm"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Starter Kit */}
      <StarterKitEditor
        kit={starterKit}
        isDefault={!kitCustomized}
        onChange={updateKit}
        onReset={resetKit}
        hosts={raceHosts}
        onHostsChange={(next) => {
          setRaceHosts(next)
          setHostsDirty(true)
        }}
      />

      {/* Sessions */}
      {!isNew && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sessions ({sessions.length})</CardTitle>
            <Button onClick={handleAddSession} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </CardHeader>
          <CardContent className="space-y-bc-2">
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No sessions yet. Add a session to get started.
              </p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-2 p-2 rounded border border-border bg-background"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <LessonTypeBadge type={session.type || "VIDEO"} />
                  <span className="flex-1 font-medium">{session.title}</span>
                  {session.date && (
                    <span className="text-sm text-muted-foreground">
                      {formatDate(new Date(session.date))}
                    </span>
                  )}
                  {session.duration && (
                    <span className="text-sm text-muted-foreground">
                      {session.duration} min
                    </span>
                  )}
                  {session.isFree && <Badge variant="outline">Free</Badge>}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingSession(session.id)
                      setSessionForm(session)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDeletingSessionId(session.id)
                      setShowDeleteSessionDialog(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Teams */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-bc-0">
          <CardTitle>Teams</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAddTeamDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Team
          </Button>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          <div className="space-y-bc-2">
            <Label htmlFor="maxSelections">Max Selections per Team</Label>
            <Input
              id="maxSelections"
              name="maxSelections"
              type="number"
              min={1}
              value={formData.maxSelections}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxSelections: parseInt(e.target.value) || DEFAULT_SLOTS_PER_SQUAD,
                }))
              }
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of agents each team can select. This is the single source of truth for
              seat counts — it drives every public seat count shown for this hackathon (team pages,
              the hackathon page, resources) and is the cap the selection API enforces when a team
              picks an agent, so changing it after selection opens changes both at once.
            </p>
          </div>

          <div className="space-y-bc-2">
            <Label>Teams participating in this hackathon</Label>
            {teams.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                No teams exist yet — use Add Team to create the first one.
              </p>
            ) : (
              <div className="space-y-bc-2">
                {teams.map((team) => {
                  const isSelected = selectedTeamIds.has(team.id)
                  const applicationCount = teamApplicationCounts[team.id] || 0
                  const selectedCount = teamSelectedCounts[team.id] || 0

                  return (
                    <div
                      key={team.id}
                      className={`p-3 border rounded-bc-lg ${
                        isSelected ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`team-${team.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              setSelectedTeamIds((prev) => {
                                const next = new Set(prev)
                                if (checked) {
                                  next.add(team.id)
                                } else {
                                  next.delete(team.id)
                                }
                                return next
                              })
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <TeamLogoBadge
                              logoUrl={team.logoUrl}
                              logoUrlDark={team.logoUrlDark}
                              alt={team.name}
                              className="h-6 w-6 rounded-full shrink-0"
                              imageSize={16}
                              iconClassName="h-3 w-3"
                            />
                            <Label
                              htmlFor={`team-${team.id}`}
                              className="cursor-pointer font-medium"
                            >
                              {team.name}
                            </Label>
                          </div>
                        </div>
                        {createdTeamIds.has(team.id) ? (
                          <Link
                            href={`/admin/teams/${team.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            New — add logos, rules &amp; resources
                          </Link>
                        ) : (
                          isSelected && !isNew && (
                            <div className="text-sm text-muted-foreground">
                              {selectedCount} selected, {applicationCount} applications
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddTeamDialog
        open={showAddTeamDialog}
        onOpenChange={setShowAddTeamDialog}
        hackathonId={isNew ? null : hackathon.id}
        onCreated={(team) => {
          setCreatedTeams((prev) => [...prev, team])
          setSelectedTeamIds((prev) => new Set(prev).add(team.id))
          router.refresh()
        }}
      />

      {/* Delete Hackathon */}
      {!isNew && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete this hackathon</p>
                <p className="text-sm text-muted-foreground">
                  Once deleted, this hackathon and all its sessions and applications
                  will be permanently removed.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Hackathon
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Editor Dialog */}
      <Dialog
        open={!!editingSession}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSession(null)
            setSessionForm({})
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-bc-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-bc-2">
                <Label>Title</Label>
                <Input
                  value={sessionForm.title || ""}
                  onChange={(e) =>
                    setSessionForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-bc-2">
                <Label>Slug</Label>
                <Input
                  value={sessionForm.slug || ""}
                  onChange={(e) =>
                    setSessionForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="auto-generated-from-title"
                />
              </div>
            </div>

            <div className="space-y-bc-2">
              <Label>Sponsor Team (optional)</Label>
              <Select
                value={sessionForm.teamId || "none"}
                onValueChange={(value) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    teamId: value === "none" ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — general session</SelectItem>
                  {teams
                    .filter((team) => selectedTeamIds.has(team.id))
                    .map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ties this session to a sponsor as their workshop — it then shows up on that team&apos;s
                public page instead of only the general schedule.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-bc-2">
                <Label>Type</Label>
                <Select
                  value={sessionForm.type || "VIDEO"}
                  onValueChange={(value) =>
                    setSessionForm((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="ARTICLE">Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-bc-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={sessionForm.duration || ""}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      duration: parseInt(e.target.value) || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-bc-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={
                    sessionForm.date
                      ? new Date(sessionForm.date).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      date: e.target.value || null,
                    }))
                  }
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox
                  id="sessionFree"
                  checked={sessionForm.isFree !== false}
                  onCheckedChange={(checked) =>
                    setSessionForm((prev) => ({ ...prev, isFree: checked === true }))
                  }
                />
                <Label htmlFor="sessionFree" className="cursor-pointer">
                  Free session
                </Label>
              </div>
            </div>

            {sessionForm.type === "VIDEO" && (
              <div className="space-y-bc-2">
                <Label>Video URL</Label>
                <Input
                  value={sessionForm.videoId || ""}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      videoId: e.target.value || null,
                    }))
                  }
                  placeholder="YouTube, Vimeo, or Loom URL"
                />
              </div>
            )}

            <div className="space-y-bc-2">
              <Label>Description / Content (Markdown)</Label>
              <Textarea
                value={sessionForm.content || sessionForm.description || ""}
                onChange={(e) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    content: e.target.value || null,
                    description: e.target.value || null,
                  }))
                }
                rows={6}
                placeholder="Session content in markdown format..."
              />
            </div>

            <div className="space-y-bc-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={sessionForm.sortOrder || 0}
                onChange={(e) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value) || 0,
                  }))
                }
                className="max-w-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingSession(null)
                setSessionForm({})
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSession}>Save Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Hackathon Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hackathon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {formData.title}? This action
              cannot be undone. All sessions and applications associated with this
              hackathon will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHackathon}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Session Confirmation Dialog */}
      <AlertDialog
        open={showDeleteSessionDialog}
        onOpenChange={(open) => {
          setShowDeleteSessionDialog(open)
          if (!open) setDeletingSessionId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSession}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={isDeletingSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingSession ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
