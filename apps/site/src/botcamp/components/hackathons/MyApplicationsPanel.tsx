"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trophy, Calendar, ArrowRight, Trash2, Lock, Flag } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { applicationStatusColors } from "@/botcamp/lib/design-constants"
import { MAX_APPLICATIONS_PER_HACKATHON } from "@/botcamp/lib/hackathon-squads"
import { cn } from "@/botcamp/lib/utils"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

export interface HubApplication {
  id: string
  status: string
  strategyId: number | null
  strategyTitle: string | null
  /** Ranked team preferences, already resolved to display names. */
  teamPreferenceNames: string[]
  selectedTeamName: string | null
}

interface MyApplicationsPanelProps {
  hackathonSlug: string
  applications: HubApplication[]
  /** Hackathon.status — past the Open stage the panel shows race status instead. */
  stage: string
  /** isRegistrationOpen() — the Open stage, before registrationEnd. */
  applicationsOpen: boolean
  /** Formatted date applications open, shown while the hackathon is Coming Soon. */
  opensOn: string | null
  /** Formatted race start, e.g. "Oct 1, 2026 at 15:00 UTC". */
  raceStartsOn: string
  /** Formatted application deadline (the "Submissions Close" session date). */
  deadline: string | null
  /** True when the builder already has an Agent/Controller strategy. */
  hasStrategy: boolean
  /** The hub's race countdown already says where the builder stands. */
  hideRaceStatus?: boolean
}

/** Step box in the build/apply flow — gets a gold frame with a one-way sheen sweep while it's the active step. */
function StepCard({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) {
    return (
      <div className="rounded-bc-lg border border-border bg-background/40 p-4">
        {children}
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-bc-lg"
      style={{
        padding: "1.5px",
        background:
          "linear-gradient(115deg, rgba(247,201,72,.9), rgba(247,201,72,.15) 40%, rgba(247,201,72,.6))",
      }}
    >
      {/* Sits under the opaque inner card, so it only ever shows through the 1.5px frame — never a tint on the content. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-2/5 pointer-events-none motion-safe:animate-bh-sheen"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,.8), transparent)",
        }}
      />
      <div className="relative rounded-[7px] bg-background p-4">{children}</div>
    </div>
  )
}

/**
 * Once applications close, the build/apply steps give way to where the
 * builder stands: racing for a team, waiting on selections, or watching.
 */
function RaceStatus({
  stage,
  hackathonSlug,
  applications,
  raceStartsOn,
}: {
  stage: string
  hackathonSlug: string
  applications: HubApplication[]
  raceStartsOn: string
}) {
  const selected = applications.filter((a) => a.selectedTeamName)
  const submitted = applications.some((a) => a.status !== "DRAFT")
  const racePending = stage === "COUNTDOWN" || stage === "REGISTRATION"
  const raceOver = stage === "JUDGING" || stage === "COMPLETED"

  if (selected.length > 0) {
    return (
      <div className="space-y-bc-3 rounded-bc-lg border border-primary/40 bg-primary/5 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Trophy className="h-4 w-4" />
          {raceOver ? "You raced for" : "You're racing for"} {selected.map((a) => a.selectedTeamName).join(" and ")}
        </p>
        {racePending ? (
          <p className="text-sm text-muted-foreground">
            The race starts {raceStartsOn}. Your agent&apos;s code and strategy.md freeze at the
            start — keep refining until then.
          </p>
        ) : raceOver ? null : (
          <p className="text-sm text-muted-foreground">
            Your agent&apos;s code is frozen for the race.
          </p>
        )}
        {racePending && (
          <div className="flex flex-wrap gap-2">
            {selected.map((a) =>
              a.strategyId ? (
                <Button key={a.id} size="sm" asChild>
                  <Link href={`/dashboard/strategies/${a.strategyId}`}>
                    Refine {selected.length > 1 ? a.strategyTitle ?? "strategy" : "your strategy"}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : null
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-bc-3 rounded-bc-lg border border-border bg-background/40 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4 text-muted-foreground" />
        Applications are closed
      </p>
      <p className="text-sm text-muted-foreground">
        {stage === "REGISTRATION" && submitted
          ? "Teams are finalizing their picks. You'll see it here if you're selected."
          : racePending
            ? submitted
              ? `Team rosters are final and your agent wasn't picked this time. The race starts ${raceStartsOn} — follow it live.`
              : `The race starts ${raceStartsOn}. Follow it live on the leaderboard.`
            : "Follow the race on the leaderboard."}
      </p>
      {/* The public page has no leaderboard section until the race starts. */}
      {!racePending && (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/hackathons/${hackathonSlug}#leaderboard`}>
            <Flag className="mr-1 h-4 w-4" />
            View leaderboard
          </Link>
        </Button>
      )}
    </div>
  )
}

export function MyApplicationsPanel({
  hackathonSlug,
  applications,
  stage,
  applicationsOpen,
  opensOn,
  raceStartsOn,
  deadline,
  hasStrategy,
  hideRaceStatus = false,
}: MyApplicationsPanelProps) {
  // Before Open the steps preview what's coming; after it, they're history.
  const showSteps = applicationsOpen || stage === "COMING_SOON"
  const router = useRouter()
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const limitReached = applications.length >= MAX_APPLICATIONS_PER_HACKATHON

  const withdraw = async (id: string) => {
    setError(null)
    setWithdrawingId(id)
    try {
      const res = await fetch(`/api/hackathons/${hackathonSlug}/applications/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to withdraw application")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to withdraw")
    } finally {
      setWithdrawingId(null)
    }
  }

  return (
    <div className="space-y-bc-4">
      {applicationsOpen && deadline && (
        <p className="text-sm text-muted-foreground">
          Submit your application before {deadline}.
        </p>
      )}

      {!showSteps && !hideRaceStatus && (
        <RaceStatus
          stage={stage}
          hackathonSlug={hackathonSlug}
          applications={applications}
          raceStartsOn={raceStartsOn}
        />
      )}

      {/* Two-step flow: build first, then apply once the window opens. */}
      {showSteps && (
        <div className="grid gap-3 sm:grid-cols-2">
          <StepCard active={!hasStrategy}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Step 1
            </p>
            <p className="text-sm font-medium mb-1">Build Your Strategy</p>
            <p className="text-xs text-muted-foreground mb-3">
              Create the Agent or Controller strategy you&apos;ll race with.
            </p>
            <Button size="sm" asChild>
              <Link href="/dashboard/strategies/new?type=AGENT">
                Build your strategy
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </StepCard>

          <StepCard active={hasStrategy}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Step 2
            </p>
            <p className="text-sm font-medium mb-1">Apply to Teams</p>
            <p className="text-xs text-muted-foreground mb-3">
              Apply and select your preferred teams.
            </p>
            {applicationsOpen ? (
              limitReached ? (
                <p className="text-xs text-muted-foreground">
                  You&apos;ve reached the limit of {MAX_APPLICATIONS_PER_HACKATHON} agents submitted per hackathon.
                </p>
              ) : (
                <ReadOnlyHint><Button size="sm" disabled>
                  <Plus className="mr-1 h-4 w-4" />
                  {applications.length === 0 ? "Apply to a team" : "New application"}
                </Button></ReadOnlyHint>
              )
            ) : (
              <Button size="sm" disabled>
                <Calendar className="mr-1 h-4 w-4" />
                {opensOn ? `Opens ${opensOn}` : "Opens soon"}
              </Button>
            )}
          </StepCard>
        </div>
      )}

      {/* Existing applications */}
      {applications.length > 0 && (
        <ul className="space-y-bc-2">
          {applications.map((app) => {
            const statusColor =
              applicationStatusColors[app.status] ?? applicationStatusColors.DRAFT
            return (
              <li
                key={app.id}
                className="rounded-bc-lg border border-border bg-background/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {app.strategyTitle ?? "Untitled agent"}
                    </p>
                    {app.teamPreferenceNames.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Prefs: {app.teamPreferenceNames.join(" › ")}
                      </p>
                    )}
                    {app.selectedTeamName && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-500">
                        <Trophy className="h-3 w-3" />
                        Selected by {app.selectedTeamName}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusColor)}>
                    {app.status}
                  </Badge>
                </div>
                {applicationsOpen && (
                  <div className="mt-2 flex items-center gap-2">
                    <ReadOnlyHint><Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled>
                      Edit
                    </Button></ReadOnlyHint>
                    {app.status === "DRAFT" && (
                      <ReadOnlyHint><Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => withdraw(app.id)}
                        disabled>
                        {withdrawingId === app.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                        )}
                        Withdraw
                      </Button></ReadOnlyHint>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
