"use client"

import { AlertCircle, CheckCircle, Clock, MessageSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { AgentVersionStatusBadge } from "@/botcamp/components/agents/AgentVersionStatusBadge"
import { cn } from "@/botcamp/lib/utils"

interface AgentReviewCardProps {
  version: number
  status: string
  reviewNote?: string | null
  feedback?: { path: string; category: string; message: string }[]
  /** An approved version Condor keeps serving while a newer one is reviewed or fixed. */
  hasApprovedVersion: boolean
}

const STATES: Record<string, { icon: typeof Clock; tone: string; heading: string; body: string }> = {
  PENDING: {
    icon: Clock,
    tone: "border-warning/40",
    heading: "In AI review",
    body: "The AI review is checking the package for safety. You'll get an email when it's done.",
  },
  NEEDS_REVIEW: {
    icon: Clock,
    tone: "border-warning/40",
    heading: "Waiting for an admin",
    body: "It passed the AI review. A Botcamp admin gives it a final look before Condor can clone it.",
  },
  REJECTED: {
    icon: AlertCircle,
    tone: "border-destructive/50",
    heading: "Changes needed",
    body: "This version wasn't approved. Fix what's listed below and upload a new version.",
  },
  APPROVED: {
    icon: CheckCircle,
    tone: "border-success/40",
    heading: "Approved — Condor Ready",
    body: "Anyone with access can clone it from Condor's Hub. A new upload is reviewed the same way.",
  },
}

/**
 * Where an agent's review stands, at the top of its editor: the newest
 * version's state, the admin's note and, on a rejection, what to fix. The
 * full version history stays in the agent package card below.
 */
export function AgentReviewCard({
  version,
  status,
  reviewNote,
  feedback = [],
  hasApprovedVersion,
}: AgentReviewCardProps): React.JSX.Element | null {
  const state = STATES[status]
  if (!state) return null
  const Icon = state.icon
  const stillServing = hasApprovedVersion && status !== "APPROVED"

  return (
    <Card className={state.tone}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Icon className="h-5 w-5" />
          Review: {state.heading}
          <span className="font-mono text-sm font-normal text-muted-foreground">v{version}</span>
          <AgentVersionStatusBadge status={status} />
        </CardTitle>
        <CardDescription>
          {state.body}
          {stillServing && " Condor keeps serving your last approved version meanwhile."}
        </CardDescription>
      </CardHeader>
      {(reviewNote || feedback.length > 0) && (
        <CardContent className="space-y-bc-3">
          {reviewNote && (
            <div className="flex gap-2 rounded-bc-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p>
                <span className="font-medium">Reviewer note:</span> {reviewNote}
              </p>
            </div>
          )}
          {feedback.length > 0 && (
            <div className="space-y-bc-1.5">
              <p className="text-sm font-medium">What to fix</p>
              <ul className="space-y-bc-1.5">
                {feedback.map((item, i) => (
                  <li key={i} className={cn("rounded-bc-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm")}>
                    {item.path && <span className="block font-mono text-xs text-muted-foreground">{item.path}</span>}
                    {item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <a href="#agent-package" className="inline-block text-sm font-medium text-primary hover:underline">
            Version history
          </a>
        </CardContent>
      )}
    </Card>
  )
}
