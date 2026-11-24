"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/botcamp/lib/utils"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Badge } from "@/botcamp/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/botcamp/components/ui/radio-group"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
import { Label } from "@/botcamp/components/ui/label"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { strategyTypeColors, applicationStatusColors } from "@/botcamp/lib/design-constants"
import { MAX_APPLICATIONS_PER_HACKATHON, MAX_TEAM_PREFERENCES } from "@/botcamp/lib/hackathon-squads"
import {
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Plus,
  ExternalLink,
  FileCheck,
  Pencil,
  ArrowUp,
  ArrowDown,
  Trash2,
  Bot,
} from "lucide-react"
import { formatRelativeTime } from "@/botcamp/lib/format"
import { useTheme } from "@/botcamp/contexts/ThemeContext"
import { pickTeamLogo } from "@/botcamp/lib/team-logo"

interface Team {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  logoUrlDark?: string | null
  websiteUrl: string | null
  rules: string | null
  selectedCount: number
  applicationCount: number
}

interface Strategy {
  id: number
  slug: string
  title: string
  strategyType: string
  exchanges: string[]
  updatedAt: string
}

interface ExistingApplication {
  id: string
  status: string
  teamPreferences: string[]
  strategyId: number | null
  strategyTitle: string | null
  selectedTeamName: string | null
  selectedTeamLogo: string | null
}

interface ApplicationFormProps {
  hackathonSlug: string
  teams: Team[]
  userStrategies: Strategy[]
  existingApplications: ExistingApplication[]
  maxSelections: number
  /** Whether the user is still under their strategy creation limit. */
  canCreateMoreStrategies: boolean
}

export function ApplicationForm({
  hackathonSlug,
  teams,
  userStrategies,
  existingApplications,
  maxSelections,
  canCreateMoreStrategies,
}: ApplicationFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Pre-select the squad when arriving from a "Apply to Drive [Squad]" link.
  const preselectTeamId = searchParams.get("team")
  const [step, setStep] = useState(1)
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null)
  const [teamPreferences, setTeamPreferences] = useState<string[]>(
    preselectTeamId && teams.some((t) => t.id === preselectTeamId)
      ? [preselectTeamId]
      : []
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()

  // Get strategies that haven't been used in applications
  const usedStrategyIds = existingApplications
    .map((a) => a.strategyId)
    .filter((id): id is number => id !== null)
  const availableStrategies = userStrategies.filter(
    (s) => !usedStrategyIds.includes(s.id)
  )
  const limitReached = existingApplications.length >= MAX_APPLICATIONS_PER_HACKATHON

  // Toggle team in preferences (capped at MAX_TEAM_PREFERENCES: Top 1 and Top 2 choice)
  function toggleTeamPreference(teamId: string) {
    setTeamPreferences((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((id) => id !== teamId)
      }
      if (prev.length >= MAX_TEAM_PREFERENCES) {
        return prev
      }
      return [...prev, teamId]
    })
  }

  // Move team up in preferences
  function moveUp(teamId: string) {
    setTeamPreferences((prev) => {
      const idx = prev.indexOf(teamId)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  // Move team down in preferences
  function moveDown(teamId: string) {
    setTeamPreferences((prev) => {
      const idx = prev.indexOf(teamId)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const handleContinue = () => {
    if (!selectedStrategyId) {
      setError("Please select an agent")
      return
    }
    setError(null)
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedStrategyId) {
      setError("Please select an agent")
      return
    }
    if (teamPreferences.length === 0) {
      setError("Please select at least one team preference")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/hackathons/${hackathonSlug}/applications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyId: parseInt(selectedStrategyId),
            teamPreferences,
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit application")
      }

      router.push(`/hackathons/${hackathonSlug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-bc-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Apply Your Agent</h2>
        <span className="text-sm text-muted-foreground">
          Step {step} of 2
        </span>
      </div>

      {step === 1 && (
        <>
          {/* Existing Applications */}
          {existingApplications.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Your Applications ({existingApplications.length})
              </h3>
              <div className="space-y-bc-3">
                {existingApplications.map((app) => {
                  const statusConfig = {
                    DRAFT: { label: "Draft", icon: Pencil, className: applicationStatusColors.DRAFT, canEdit: true },
                    FINALIZED: { label: "Finalized", icon: FileCheck, className: applicationStatusColors.FINALIZED, canEdit: true },
                    REVIEWED: { label: "Reviewed", icon: CheckCircle, className: applicationStatusColors.REVIEWED, canEdit: false },
                  }
                  const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.DRAFT
                  const StatusIcon = status.icon

                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 rounded-bc-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{app.strategyTitle || "No agent selected"}</p>
                          <p className="text-sm text-muted-foreground">
                            {app.teamPreferences.length} team{app.teamPreferences.length !== 1 ? "s" : ""} ranked
                            {app.selectedTeamName && (
                              <span className="text-success ml-2">• Selected by {app.selectedTeamName}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={status.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        {status.canEdit && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/hackathons/${hackathonSlug}/applications/${app.id}/edit`}>
                              Edit
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* New Application */}
          {limitReached ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  You&apos;ve reached the limit of {MAX_APPLICATIONS_PER_HACKATHON} agents per
                  hackathon, including drafts.
                </p>
                <Button asChild variant="outline">
                  <Link href={`/hackathons/${hackathonSlug}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Hackathon
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                {existingApplications.length > 0 ? "Submit another agent:" : "Select an agent to apply with:"}
              </p>

              {availableStrategies.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    {userStrategies.length === 0 ? (
                      <>
                        <p className="text-muted-foreground mb-4">
                          You don&apos;t have any strategies.
                        </p>
                        {canCreateMoreStrategies ? (
                          <Button asChild>
                            <Link href="/dashboard/strategies/new?type=AGENT">
                              <Plus className="mr-2 h-4 w-4" />
                              Build your strategy
                            </Link>
                          </Button>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            You&apos;ve reached your strategy limit — manage your strategies in{" "}
                            <Link href="/dashboard/strategies" className="underline">
                              My Strategies
                            </Link>
                            .
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground mb-4">
                          All your agents have already been submitted.
                        </p>
                        <div className="flex gap-4 justify-center">
                          <Button asChild variant="outline">
                            <Link href={`/hackathons/${hackathonSlug}`}>
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              Back to Hackathon
                            </Link>
                          </Button>
                          {canCreateMoreStrategies && (
                            <Button asChild>
                              <Link href="/dashboard/strategies/new?type=AGENT">
                                <Plus className="mr-2 h-4 w-4" />
                                Create New Agent
                              </Link>
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <RadioGroup
                    value={selectedStrategyId || ""}
                    onValueChange={setSelectedStrategyId}
                    className="space-y-bc-3"
                  >
                    {availableStrategies.map((strategy) => (
                      <div
                        key={strategy.id}
                        className={cn(
                          "flex items-center space-x-bc-4 rounded-bc-lg border p-4 cursor-pointer transition-colors",
                          selectedStrategyId === String(strategy.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setSelectedStrategyId(String(strategy.id))}
                      >
                        <RadioGroupItem
                          value={String(strategy.id)}
                          id={`strategy-${strategy.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`strategy-${strategy.id}`}
                            className="text-base font-medium cursor-pointer"
                          >
                            {strategy.title}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Updated {formatRelativeTime(strategy.updatedAt)}
                            {strategy.exchanges.length > 0 && (
                              <> &middot; {strategy.exchanges.join(", ")}</>
                            )}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={strategyTypeColors[strategy.strategyType]}
                        >
                          {strategy.strategyType}
                        </Badge>
                      </div>
                    ))}
                  </RadioGroup>

                  {canCreateMoreStrategies && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Don&apos;t have an agent yet?</span>
                      <Link
                        href="/dashboard/strategies/new?type=AGENT"
                        className="text-primary hover:underline inline-flex items-center"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Create New Agent
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-bc-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-4">
                    <Button asChild variant="outline">
                      <Link href={`/hackathons/${hackathonSlug}`}>Cancel</Link>
                    </Button>
                    <Button onClick={handleContinue} disabled={!selectedStrategyId}>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {step === 2 && (
        <>
          {/* Selected Strategy Header */}
          <div className="flex items-center justify-between p-4 rounded-bc-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                Agent: {userStrategies.find((s) => String(s.id) === selectedStrategyId)?.title}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change
            </Button>
          </div>

          <div className="space-y-bc-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Rank Your Team Preferences</h3>
              <p className="text-muted-foreground text-sm">
                Choose up to {MAX_TEAM_PREFERENCES} squads — your Top 1 and Top 2 choice. Each squad selects its Agent Drivers.
              </p>
            </div>

            {/* Selected teams (ranked) */}
            {teamPreferences.length > 0 && (
              <div className="space-y-bc-2">
                <Label className="text-sm font-medium">Your Rankings</Label>
                <div className="space-y-bc-2">
                  {teamPreferences.map((teamId, index) => {
                    const team = teams.find((t) => t.id === teamId)
                    if (!team) return null
                    const teamLogo = pickTeamLogo(theme, team.logoUrl, team.logoUrlDark)
                    return (
                      <div
                        key={teamId}
                        className="flex items-center gap-3 p-3 rounded-bc-lg border bg-primary/5 border-primary/30"
                      >
                        <span className="font-bold text-primary text-center whitespace-nowrap">
                          Top {index + 1}
                        </span>
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {teamLogo ? (
                            <Image
                              src={teamLogo}
                              alt={team.name}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="flex-1 font-medium">{team.name}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveUp(teamId)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveDown(teamId)}
                            disabled={index === teamPreferences.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => toggleTeamPreference(teamId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Available teams */}
            <div className="space-y-bc-2">
              <Label className="text-sm font-medium">
                {teamPreferences.length > 0 ? "Add More Teams" : "Select Teams"}
              </Label>
              {teamPreferences.length >= MAX_TEAM_PREFERENCES && (
                <p className="text-xs text-muted-foreground">
                  You&apos;ve picked {MAX_TEAM_PREFERENCES} teams — remove one to choose a different squad.
                </p>
              )}
              <div className="space-y-bc-2">
                {teams
                  .filter((t) => !teamPreferences.includes(t.id))
                  .map((team) => {
                    const teamLogo = pickTeamLogo(theme, team.logoUrl, team.logoUrlDark)
                    const limitReached = teamPreferences.length >= MAX_TEAM_PREFERENCES
                    return (
                    <div
                      key={team.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-bc-lg border border-border transition-colors",
                        limitReached
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-primary/50 cursor-pointer"
                      )}
                      onClick={() => !limitReached && toggleTeamPreference(team.id)}
                    >
                      <Checkbox
                        checked={false}
                        disabled={limitReached}
                        onCheckedChange={() => toggleTeamPreference(team.id)}
                      />
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {teamLogo ? (
                          <Image
                            src={teamLogo}
                            alt={team.name}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        ) : (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{team.name}</p>
                        {team.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {team.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {team.selectedCount}/{maxSelections}
                      </span>
                    </div>
                    )
                  })}
              </div>
            </div>

            {/* Show first team's rules if selected */}
            {teamPreferences.length > 0 && (
              <div className="pt-4 border-t">
                {(() => {
                  const firstTeam = teams.find((t) => t.id === teamPreferences[0])
                  if (!firstTeam?.rules) return null
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {firstTeam.name} Selection Criteria
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MarkdownContent content={firstTeam.rules} className="prose-sm" />
                      </CardContent>
                    </Card>
                  )
                })()}
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-bc-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || teamPreferences.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
