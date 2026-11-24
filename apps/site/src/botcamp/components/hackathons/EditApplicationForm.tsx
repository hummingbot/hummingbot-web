"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/botcamp/lib/utils"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Badge } from "@/botcamp/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/botcamp/components/ui/radio-group"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
import { Label } from "@/botcamp/components/ui/label"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { strategyTypeColors, applicationStatusColors } from "@/botcamp/lib/design-constants"
import { BOTCAMP_SLUG, MAX_TEAM_PREFERENCES } from "@/botcamp/lib/hackathon-squads"
import {
  Users,
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  ExternalLink,
  Save,
  Send,
  Clock,
  Trash2,
  Bot,
  ArrowUp,
  ArrowDown,
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
  rules: string | null
}

interface Strategy {
  id: number
  slug: string
  title: string
  strategyType: string
  exchanges: string[]
  updatedAt: string
}

interface EditApplicationFormProps {
  applicationId: string
  hackathonSlug: string
  teams: Team[]
  currentStrategyId: number | null
  currentTeamPreferences: string[]
  userStrategies: Strategy[]
  maxSelections: number
  status: string
  /** Whether the user is still under their strategy creation limit. */
  canCreateMoreStrategies: boolean
}

export function EditApplicationForm({
  applicationId,
  hackathonSlug,
  teams,
  currentStrategyId,
  currentTeamPreferences,
  userStrategies,
  status,
  canCreateMoreStrategies,
}: EditApplicationFormProps) {
  const router = useRouter()
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(
    currentStrategyId ? String(currentStrategyId) : null
  )
  const [teamPreferences, setTeamPreferences] = useState<string[]>(currentTeamPreferences)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()

  const hasAgent = !!selectedStrategyId
  const hasTeamPrefs = teamPreferences.length > 0
  const canFinalize = hasAgent && hasTeamPrefs

  // Progress tracking
  const requirements = [
    { label: "Agent Selected", done: hasAgent },
    { label: "Team Preferences Set", done: hasTeamPrefs },
  ]
  const completed = requirements.filter((r) => r.done).length
  const percent = Math.round((completed / requirements.length) * 100)

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

  async function handleSave() {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/hackathons/${hackathonSlug}/applications/${applicationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyId: selectedStrategyId ? parseInt(selectedStrategyId) : null,
            teamPreferences,
            status: "DRAFT",
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save application")
      }

      router.push(`/hackathons/${hackathonSlug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleFinalize() {
    if (!selectedStrategyId) {
      setError("Please select an agent to finalize your application")
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
        `/api/hackathons/${hackathonSlug}/applications/${applicationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyId: parseInt(selectedStrategyId),
            teamPreferences,
            status: "FINALIZED",
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to finalize application")
      }

      router.push(`/hackathons/${hackathonSlug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to withdraw this application?")) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/hackathons/${hackathonSlug}/applications/${applicationId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete application")
      }

      router.push(`/hackathons/${hackathonSlug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsDeleting(false)
    }
  }

  const statusLabel = status === "DRAFT" ? "Draft" : status === "FINALIZED" ? "Finalized" : status
  const StatusIcon = status === "DRAFT" ? Clock : Check

  return (
    <div className="space-y-bc-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/hackathons/${hackathonSlug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Hackathon
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Application</h1>
          <p className="text-muted-foreground">Select your agent and rank your team preferences</p>
        </div>
        <Badge variant="outline" className={applicationStatusColors[status]}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusLabel}
        </Badge>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-bc-lg text-sm">
          {error}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main Content Area */}
        <div className="space-y-bc-6 min-w-0">
          {/* Strategy Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5" />
                Select Your Agent
                <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription>
                Choose which agent to submit for this hackathon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-bc-4">
              {userStrategies.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-bc-lg">
                  <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
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
                </div>
              ) : (
                <>
                  <RadioGroup
                    value={selectedStrategyId || ""}
                    onValueChange={setSelectedStrategyId}
                    className="space-y-bc-3"
                  >
                    {userStrategies.map((strategy) => (
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Team Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Team Preferences
                <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription>
                Choose up to {MAX_TEAM_PREFERENCES} squads — your Top 1 and Top 2 choice (each squad selects its Agent Drivers)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-bc-4">
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
                    // Botcamp can't be newly added — it only appears above in
                    // "Your Rankings" if a legacy application already ranked it.
                    .filter((t) => !teamPreferences.includes(t.id) && t.slug !== BOTCAMP_SLUG)
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
                      <div className="space-y-bc-2">
                        <Label className="text-sm font-medium">
                          {firstTeam.name} Selection Criteria
                        </Label>
                        <div className="p-4 rounded-bc-lg bg-muted/50">
                          <MarkdownContent content={firstTeam.rules} className="prose-sm" />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-bc-4 lg:sticky lg:top-20">
          {/* Progress Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Application Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-bc-4">
              {/* Progress Bar */}
              <div className="space-y-bc-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">
                    {completed}/{requirements.length}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      percent === 100 ? "bg-success" : "bg-primary"
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Requirements List */}
              <div className="space-y-bc-2">
                {requirements.map((req) => (
                  <div key={req.label} className="flex items-center gap-2 text-sm">
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full flex items-center justify-center",
                        req.done ? "bg-success" : "bg-muted"
                      )}
                    >
                      {req.done && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className={req.done ? "text-muted-foreground" : ""}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-bc-3">
              <Button
                onClick={handleFinalize}
                disabled={isLoading || isSaving || !canFinalize}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Finalize Application
              </Button>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="w-full"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save as Draft
              </Button>
              {status === "DRAFT" && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isDeleting || isLoading || isSaving}
                  className="w-full text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/5"
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Withdraw Application
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
