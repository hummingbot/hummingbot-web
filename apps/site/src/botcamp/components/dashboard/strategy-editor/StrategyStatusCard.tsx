"use client"

import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import {
  Save,
  Loader2,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Award,
  Trash2,
  Trophy,
} from "lucide-react"
import type { StrategyStatus } from "@/botcamp/types"
import { strategyStatusColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { FINALS_CODE_FREEZE_HOURS } from "@/botcamp/lib/hackathon-stages"
import type { HackathonApplyInfo, HackathonEditInfo } from "./types"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface StrategyStatusCardProps {
  status: StrategyStatus
  canCertify: boolean
  canSubmit: boolean
  /** A non-member's agent page: reviewed per uploaded version, so no Submit for Review. */
  agentOnly: boolean
  /** Condor installs it by slug, so the page can't be discarded any more. */
  hasApprovedAgentVersion: boolean
  /**
   * Set for an agent page: its state is its newest version's review, not the
   * strategy's draft status (null before the first upload).
   */
  agentReview?: { latest: { version: number; status: string } | null }
  isLoading: boolean
  isSubmitting: boolean
  isCertifying: boolean
  isDiscarding: boolean
  onSave: () => void
  onOpenSubmitDialog: () => void
  onOpenCertifyDialog: () => void
  onOpenDiscardDialog: () => void
  /** False while content is locked, so there is nothing to save. */
  canEditContent: boolean
  hackathonEdit: HackathonEditInfo
  /** Non-null once the strategy is saved and there's an open hackathon it can be applied to. */
  hackathonApply: HackathonApplyInfo | null
  onApplyToHackathon: () => void
}

const iconComponents = {
  Clock,
  AlertCircle,
  CheckCircle,
  Award,
}

function getStatusIcon(status: StrategyStatus) {
  const config = strategyStatusColors[status]
  const IconComponent = iconComponents[config.icon as keyof typeof iconComponents]
  return <IconComponent className={cn("h-5 w-5", config.iconColor)} />
}

// Code freeze lands at 00:00 UTC, so a date alone ("Oct 4") would read as
// "through Oct 4" — spell out the time.
function formatFreeze(iso: string): string {
  const day = new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
  return `${day}, 00:00 UTC`
}

function getHackathonNote(hackathonEdit: HackathonEditInfo): string | null {
  if (hackathonEdit.kind === "selected") {
    return `Your agent holds a ${hackathonEdit.teamName} seat in the finals. You can keep editing it until code freezes for the finals (${formatFreeze(hackathonEdit.codeFreeze)}), ${FINALS_CODE_FREEZE_HOURS} hours before the race.`
  }
  if (hackathonEdit.kind === "locked") {
    return hackathonEdit.reason === "not_selected"
      ? "Hackathon submissions are closed. Only agents selected for the finals can be edited."
      : `Code froze for the finals on ${formatFreeze(hackathonEdit.codeFreeze)}. Your agent can't be edited during the race.`
  }
  return null
}

// An agent page's state, from its newest version's review.
function getAgentState(latest: { version: number; status: string } | null, hasApproved: boolean) {
  if (!latest) {
    return {
      icon: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
      label: "No Package Yet",
      message: "Upload your agent in the Condor Agent Package card. It's checked right away, then reviewed.",
    }
  }
  if (latest.status === "PENDING" || latest.status === "NEEDS_REVIEW") {
    return {
      icon: <Clock className="h-5 w-5 text-warning" />,
      label: "In Review",
      message: `Version ${latest.version} is being reviewed${
        latest.status === "NEEDS_REVIEW" ? ": it passed the AI review and is waiting for an admin" : ""
      }.${hasApproved ? " Condor keeps serving your last approved version meanwhile." : ""}`,
    }
  }
  if (latest.status === "REJECTED") {
    return {
      icon: <AlertCircle className="h-5 w-5 text-destructive" />,
      label: "Changes Needed",
      message: `Version ${latest.version} wasn't approved. See what to fix in the Condor Agent Package card, then upload a new version.${
        hasApproved ? " Condor keeps serving your last approved version." : ""
      }`,
    }
  }
  return {
    icon: <CheckCircle className="h-5 w-5 text-success" />,
    label: "Condor Ready",
    message: `Version ${latest.version} is approved: anyone with access can clone it from Condor's Hub. Upload a new version any time; it's reviewed the same way.`,
  }
}

function getStatusLabel(status: StrategyStatus): string {
  if (status === "CHANGES_REQUESTED") return "Changes Requested"
  return status.charAt(0) + status.slice(1).toLowerCase()
}

export function StrategyStatusCard({
  status,
  canCertify,
  canSubmit,
  agentOnly,
  hasApprovedAgentVersion,
  agentReview,
  isLoading,
  isSubmitting,
  isCertifying,
  isDiscarding,
  onSave,
  onOpenSubmitDialog,
  onOpenCertifyDialog,
  onOpenDiscardDialog,
  canEditContent,
  hackathonEdit,
  hackathonApply,
  onApplyToHackathon,
}: StrategyStatusCardProps) {
  void canSubmit // read-only preview: Submit is always disabled
  const hackathonNote = getHackathonNote(hackathonEdit)
  const agentState = agentReview ? getAgentState(agentReview.latest, hasApprovedAgentVersion) : null
  const saveButton = canEditContent ? (
    <ReadOnlyHint block><Button variant="outline" onClick={onSave} className="w-full" disabled>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Save className="mr-2 h-4 w-4" />
      )}
      Save Changes
    </Button></ReadOnlyHint>
  ) : null

  return (
    <Card className={strategyStatusColors[status].border}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {agentState ? agentState.icon : getStatusIcon(status)}
          {agentState ? agentState.label : getStatusLabel(status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {hackathonNote && (
          <p
            className={cn(
              "p-3 rounded-bc-lg border text-xs flex gap-2",
              hackathonEdit.kind === "selected"
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground"
            )}
          >
            <Trophy className="h-4 w-4 shrink-0 text-primary" />
            {hackathonNote}
          </p>
        )}

        {status === "CHANGES_REQUESTED" && (
          <p className="text-sm text-muted-foreground">
            Check the comments section for admin feedback.
          </p>
        )}

        {agentState && (
          <div className="space-y-bc-2">
            {/* With a version uploaded, the review card at the top of the
                page carries the details; this only points to it. */}
            <p className="text-sm text-muted-foreground">
              {agentReview?.latest ? "The review is at the top of the page." : agentState.message}
            </p>
            <a href="#agent-package" className="inline-block text-sm font-medium text-primary hover:underline">
              Go to the agent package
            </a>
          </div>
        )}

        {(status === "DRAFT" || status === "CHANGES_REQUESTED") && (
          <div className="space-y-bc-3">
            {agentState ? (
              // An agent is done when a version is approved. A member can still
              // put it up for cohort certification, the strategy review.
              !agentOnly && (
                <div className="space-y-bc-1.5">
                  <ReadOnlyHint block><Button
                    variant="ghost"
                    onClick={onOpenSubmitDialog}
                    className="w-full"
                    disabled>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit for Cohort Review
                  </Button></ReadOnlyHint>
                  <p className="text-center text-xs text-muted-foreground">
                    Only for cohort certification. Needs details, a video and an approved agent version.
                  </p>
                </div>
              )
            ) : agentOnly ? (
              <p className="text-sm text-muted-foreground">
                {hasApprovedAgentVersion
                  ? "An agent version is approved. Each new version is reviewed when you upload it in the Condor Agent Package card."
                  : "Your page is hidden until an agent version is approved. Upload your agent in the Condor Agent Package card — each version is reviewed when you upload it."}
              </p>
            ) : (
              <ReadOnlyHint block><Button
                onClick={onOpenSubmitDialog}
                className="w-full"
                disabled>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit for Review
              </Button></ReadOnlyHint>
            )}
            {saveButton}
            {status === "DRAFT" && !hasApprovedAgentVersion && (
              <ReadOnlyHint block><Button
                variant="outline"
                onClick={onOpenDiscardDialog}
                className="w-full text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/5"
                disabled>
                {isDiscarding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Discard Draft
              </Button></ReadOnlyHint>
            )}
          </div>
        )}

        {status === "SUBMITTED" && (
          <>
            <p className="text-sm text-muted-foreground">
              Your strategy is being reviewed.
              {canEditContent && " You can still make changes while waiting for approval."}
            </p>
            {saveButton}
          </>
        )}

        {canCertify && (
          <div
            className={cn(
              "p-3 rounded-bc-lg border space-y-bc-3",
              strategyStatusColors.APPROVED.bg,
              strategyStatusColors.APPROVED.border
            )}
          >
            <p className="text-sm">
              Your strategy has been approved! Certify to complete your
              certification.
            </p>
            <ReadOnlyHint block><Button
              onClick={onOpenCertifyDialog}
              className="w-full bg-metric-purple hover:bg-metric-purple/90"
              disabled>
              {isCertifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Award className="mr-2 h-4 w-4" />
              )}
              Certify Strategy
            </Button></ReadOnlyHint>
            {saveButton}
          </div>
        )}

        {status === "CERTIFIED" && (
          <div
            className={cn(
              "p-3 rounded-bc-lg border",
              strategyStatusColors.CERTIFIED.bg,
              strategyStatusColors.CERTIFIED.border
            )}
          >
            <p
              className={cn(
                "font-medium mb-1 flex items-center gap-2 text-sm",
                strategyStatusColors.CERTIFIED.iconColor
              )}
            >
              <Award className="h-4 w-4" />
              Strategy Certified
            </p>
            <p className="text-xs text-muted-foreground">
              {canEditContent ? "You are certified!" : "You are certified! Content is locked."}
            </p>
          </div>
        )}

        {status === "CERTIFIED" && saveButton}

        {hackathonApply && (
          <ReadOnlyHint block><Button
            variant="outline"
            onClick={onApplyToHackathon}
            className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
            disabled>
            <Trophy className="mr-2 h-4 w-4" />
            Apply to {hackathonApply.title}
          </Button></ReadOnlyHint>
        )}
      </CardContent>
    </Card>
  )
}
