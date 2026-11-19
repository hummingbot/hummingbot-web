"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { HackathonStatus } from "@prisma/client"
import Link from "next/link"
import { Pencil, X, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Lock } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Label } from "@/botcamp/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import { applicationStatusColors, strategyStatusColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { ApplicationReviewShell } from "@/botcamp/components/hackathons/ApplicationReviewShell"
import { ApplicantCard } from "@/botcamp/components/hackathons/ApplicantCard"
import { StrategyReviewCard } from "@/botcamp/components/hackathons/StrategyReviewCard"
import { StrategyComments } from "@/botcamp/components/strategies/StrategyComments"
import { TeamNoteCard } from "@/botcamp/components/hackathons/TeamNoteCard"
import type { ReviewApplicant, ReviewStrategy } from "@/botcamp/components/hackathons/application-review"

type ApplicationStatus = "DRAFT" | "FINALIZED" | "REVIEWED"

interface ScoreSummary {
  average: number | null
  count: number
  entries: { adminId: string; adminName: string; score: number }[]
}

interface AdminApplicationReviewerProps {
  application: {
    id: string
    status: ApplicationStatus
    teamPreferences: string[]
    selectedTeamId: string | null
    adminNote: string | null
    myScore: number | null
    scoreSummary: ScoreSummary
    createdAt: string
    updatedAt: string
  }
  user: ReviewApplicant & { id: string; email: string }
  strategy: (ReviewStrategy & { status: string }) | null
  hackathon: {
    id: string
    slug: string
    title: string
    teamIds: string[]
    status: HackathonStatus
  }
  teams: { id: string; name: string; slug: string }[]
}

const STATUS_OPTIONS: ApplicationStatus[] = ["DRAFT", "FINALIZED", "REVIEWED"]
const SCORE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)

export function AdminApplicationReviewer({
  application,
  user,
  strategy,
  hackathon,
  teams,
}: AdminApplicationReviewerProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [teamPreferences, setTeamPreferences] = useState<string[]>(application.teamPreferences)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(application.selectedTeamId)
  const [isApplicationExpanded, setIsApplicationExpanded] = useState(false)
  const [isSavingScore, setIsSavingScore] = useState(false)
  const [adminNote, setAdminNote] = useState(application.adminNote || "")
  const [isSavingNote, setIsSavingNote] = useState(false)

  const teamNameById = new Map(teams.map((t) => [t.id, t.name]))
  const availableTeamsToAdd = teams.filter((t) => !teamPreferences.includes(t.id))
  // Applicants rank teams during REGISTRATION; once it closes, preferences
  // are frozen so a team's own selection (below) reflects a fixed field of
  // candidates instead of one still shifting under them.
  const preferencesLocked = hackathon.status !== "REGISTRATION"

  const isDirty =
    status !== application.status ||
    JSON.stringify(teamPreferences) !== JSON.stringify(application.teamPreferences) ||
    selectedTeamId !== application.selectedTeamId

  function moveTeamPreference(index: number, direction: -1 | 1) {
    const next = [...teamPreferences]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setTeamPreferences(next)
  }

  function removeTeamPreference(teamId: string) {
    setTeamPreferences(teamPreferences.filter((id) => id !== teamId))
  }

  function addTeamPreference(teamId: string) {
    if (!teamId || teamPreferences.includes(teamId)) return
    setTeamPreferences([...teamPreferences, teamId])
  }

  async function handleSave() {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/hackathons/${hackathon.slug}/applications/${application.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            teamPreferences,
            selectedTeamId,
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save application")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Each admin's score is their own row (see ApplicationScore), so it saves
  // immediately on change rather than joining the batched Save Changes above.
  async function handleScoreChange(value: string) {
    setIsSavingScore(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/hackathons/${hackathon.slug}/applications/${application.id}/score`,
        value === "__none__"
          ? { method: "DELETE" }
          : {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ score: Number(value) }),
            }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save score")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSavingScore(false)
    }
  }

  async function handleSaveAdminNote() {
    setIsSavingNote(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/hackathons/${hackathon.slug}/applications/${application.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminNote: adminNote.trim() || null }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save note")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <ApplicationReviewShell
      backHref={`/admin/hackathons/${hackathon.id}/applications`}
      error={error}
      main={
        <>
          <StrategyReviewCard
            strategy={strategy}
            typeBadgeExtra={
              strategy && (
                <Badge
                  variant="outline"
                  className={cn(
                    strategyStatusColors[strategy.status]?.bg,
                    strategyStatusColors[strategy.status]?.iconColor,
                    strategyStatusColors[strategy.status]?.border
                  )}
                >
                  {strategy.status}
                </Badge>
              )
            }
            headerActions={
              strategy && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/strategies/${strategy.id}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Strategy
                  </Link>
                </Button>
              )
            }
          />
        </>
      }
      sidebar={
        <>
          <ApplicantCard user={user} />

          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setIsApplicationExpanded((v) => !v)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Application</CardTitle>
                {isApplicationExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {!isApplicationExpanded && (
                <p className="text-xs text-muted-foreground">
                  {application.status}
                  {selectedTeamId && ` · Selected by ${teamNameById.get(selectedTeamId) || "a team"}`}
                  {application.scoreSummary.average != null &&
                    ` · Score ${application.scoreSummary.average}/10 (${application.scoreSummary.count})`}
                </p>
              )}
            </CardHeader>
            {isApplicationExpanded && (
            <CardContent className="space-y-bc-4">
              <div className="space-y-bc-2">
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-bc-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Your Score (admin only)
                </Label>
                <Select
                  value={application.myScore != null ? String(application.myScore) : "__none__"}
                  onValueChange={handleScoreChange}
                  disabled={isSavingScore}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not scored" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not scored</SelectItem>
                    {SCORE_OPTIONS.map((score) => (
                      <SelectItem key={score} value={String(score)}>
                        {score} / 10
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {application.scoreSummary.count > 0 && (
                  <div className="space-y-bc-1 rounded-bc-md border border-border px-2 py-1.5">
                    <p className="text-xs font-medium">
                      Average: {application.scoreSummary.average}/10
                      <span className="text-muted-foreground">
                        {" "}
                        ({application.scoreSummary.count}{" "}
                        {application.scoreSummary.count === 1 ? "admin" : "admins"})
                      </span>
                    </p>
                    <ul className="space-y-bc-0.5">
                      {application.scoreSummary.entries.map((entry) => (
                        <li key={entry.adminId} className="text-xs text-muted-foreground">
                          {entry.adminName}: {entry.score}/10
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-bc-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Team Preferences (ranked)
                  </Label>
                  {preferencesLocked && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>
                {preferencesLocked && (
                  <p className="text-xs text-muted-foreground">
                    Registration is closed — preferences are frozen. Use &quot;Selected By&quot; below
                    to record which team picked this applicant.
                  </p>
                )}
                {teamPreferences.length > 0 ? (
                  <ul className="space-y-bc-1.5">
                    {teamPreferences.map((teamId, index) => (
                      <li
                        key={teamId}
                        className="flex items-center gap-2 rounded-bc-md border border-border px-2 py-1.5"
                      >
                        <span className="text-xs text-muted-foreground w-4">#{index + 1}</span>
                        <span className="flex-1 text-sm font-medium">
                          {teamNameById.get(teamId) || "Unknown team"}
                        </span>
                        {!preferencesLocked && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveTeamPreference(index, -1)}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveTeamPreference(index, 1)}
                              disabled={index === teamPreferences.length - 1}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeTeamPreference(teamId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No team preferences set.</p>
                )}
                {!preferencesLocked && availableTeamsToAdd.length > 0 && (
                  <Select key={teamPreferences.join(",")} onValueChange={addTeamPreference}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add a team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeamsToAdd.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-bc-2">
                <Label className="text-sm font-medium text-muted-foreground">Selected By</Label>
                <Select
                  value={selectedTeamId ?? "__none__"}
                  onValueChange={(v) => setSelectedTeamId(v === "__none__" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not selected</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={isSubmitting || !isDirty}
              >
                Save Changes
              </Button>

              <div className="text-xs text-muted-foreground">
                Current status:{" "}
                <Badge variant="outline" className={cn(applicationStatusColors[application.status])}>
                  {application.status}
                </Badge>
              </div>
            </CardContent>
            )}
          </Card>

          <TeamNoteCard
            title="Note to Sponsor Team"
            value={adminNote}
            onChange={setAdminNote}
            placeholder="Add context for the sponsor team about this applicant (they'll see this)..."
            footer={
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAdminNote}
                disabled={isSavingNote || adminNote === (application.adminNote || "")}
              >
                Save Note
              </Button>
            }
          />

          {strategy && <StrategyComments strategySlug={strategy.slug} />}
        </>
      }
    />
  )
}
