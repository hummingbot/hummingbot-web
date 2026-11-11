"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Undo, Star } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { applicationStatusColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { isSelectionOpen, selectionClosedReason } from "@/botcamp/lib/hackathon-stages"
import { ApplicationReviewShell } from "@/botcamp/components/hackathons/ApplicationReviewShell"
import { ApplicantCard } from "@/botcamp/components/hackathons/ApplicantCard"
import { StrategyReviewCard } from "@/botcamp/components/hackathons/StrategyReviewCard"
import { TeamNoteCard } from "@/botcamp/components/hackathons/TeamNoteCard"
import { StrategyComments, type Comment } from "@/botcamp/components/strategies/StrategyComments"
import type { ReviewApplicant, ReviewStrategy } from "@/botcamp/components/hackathons/application-review"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

type ApplicationStatus = "DRAFT" | "FINALIZED" | "REVIEWED"

interface ScoreSummary {
  average: number | null
  count: number
}

interface ApplicationReviewerProps {
  application: {
    id: string
    status: ApplicationStatus
    teamNote: string | null
    adminNote: string | null
    scoreSummary: ScoreSummary
    teamPreferences: string[]
    preferenceRank: number
    isSelectedByThisTeam: boolean
    createdAt: string
    updatedAt: string
  }
  user: ReviewApplicant & { id: string }
  strategy: ReviewStrategy | null
  team: {
    slug: string
    name: string
  }
  hackathonSlug: string
  /** Hackathon.status — the stage decides whether the team can still pick. */
  hackathonStatus: string
  selectedCount: number
  maxSelections: number
  /** Base path of the team administration view, e.g. "/dashboard/team" or "/admin/teams/<id>". */
  basePath: string
  /** Read-only preview: the strategy's comments, read on the server. */
  comments: Comment[]
}

export function ApplicationReviewer({
  application,
  user,
  strategy,
  team,
  hackathonStatus,
  selectedCount,
  maxSelections,
  basePath,
  comments,
}: ApplicationReviewerProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  void isSubmitting // read-only preview: the actions are always disabled
  const [teamNote, setTeamNote] = useState(application.teamNote || "")
  const [error, setError] = useState<string | null>(null)

  const isFull = selectedCount >= maxSelections
  const isSelected = application.isSelectedByThisTeam
  const selectionsOpen = isSelectionOpen({ status: hackathonStatus })

  async function updateApplication(body: Record<string, unknown>, errorMessage: string) {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/teams/${team.slug}/applications/${application.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || errorMessage)
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelect = () =>
    updateApplication({ select: true, teamNote: teamNote.trim() || null }, "Failed to select application")

  const handleDeselect = () =>
    updateApplication({ select: false, teamNote: teamNote.trim() || null }, "Failed to deselect application")

  const saveNote = () =>
    updateApplication({ teamNote: teamNote.trim() || null }, "Failed to save note")

  return (
    <ApplicationReviewShell
      backHref={`${basePath}?tab=applicants`}
      error={error}
      main={
        <>
          <StrategyReviewCard
            strategy={strategy}
            headerActions={
              <>
                <Badge variant="outline" className={cn(applicationStatusColors[application.status])}>
                  {application.status}
                </Badge>
                {isSelected && (
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </>
            }
            topContent={
              <div className="space-y-bc-2">
                <div className="flex items-center gap-2 p-3 rounded-bc-lg bg-muted/50">
                  <Star className="h-5 w-5 text-primary" />
                  <span className="text-sm">
                    <strong>Preference Rank:</strong> #{application.preferenceRank} choice for this applicant
                  </span>
                </div>
                {application.scoreSummary.average != null && (
                  <div className="flex items-center gap-2 p-3 rounded-bc-lg bg-muted/50">
                    <Star className="h-5 w-5 text-primary" />
                    <span className="text-sm">
                      <strong>Botcamp Score:</strong> {application.scoreSummary.average}/10
                    </span>
                  </div>
                )}
              </div>
            }
          />

          {application.adminNote && (
            <TeamNoteCard title="Note from Botcamp" value={application.adminNote} readOnly />
          )}

          <TeamNoteCard
            value={teamNote}
            onChange={setTeamNote}
            placeholder="Add a note about this application (internal use only)..."
            footer={
              <ReadOnlyHint><Button
                variant="outline"
                size="sm"
                onClick={saveNote}
                disabled>
                Save Note
              </Button></ReadOnlyHint>
            }
          />
        </>
      }
      sidebar={
        <>
          <ApplicantCard user={user} />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-bc-3">
              {!isSelected ? (
                <>
                  <ReadOnlyHint block><Button
                    className="w-full"
                    onClick={handleSelect}
                    disabled>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Select Agent
                  </Button></ReadOnlyHint>
                  {!selectionsOpen && (
                    <p className="text-xs text-muted-foreground text-center">
                      {selectionClosedReason(hackathonStatus)}
                    </p>
                  )}
                  {selectionsOpen && isFull && (
                    <p className="text-xs text-amber-500 text-center">
                      All {maxSelections} slots are filled
                    </p>
                  )}
                  {selectionsOpen && application.status === "DRAFT" && (
                    <p className="text-xs text-muted-foreground text-center">
                      Application is still a draft
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Button className="w-full" disabled>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Selected
                  </Button>
                  <ReadOnlyHint block><Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleDeselect}
                    disabled>
                    <Undo className="mr-2 h-4 w-4" />
                    Deselect
                  </Button></ReadOnlyHint>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {selectedCount} / {maxSelections}
                </div>
                <div className="text-sm text-muted-foreground">slots filled</div>
              </div>
            </CardContent>
          </Card>

          {strategy && <StrategyComments strategySlug={strategy.slug} initialComments={comments} />}
        </>
      }
    />
  )
}
