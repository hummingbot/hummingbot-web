"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { HackathonStatus } from "@prisma/client"
import { AlertTriangle, ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/botcamp/components/ui/alert-dialog"
import { StagePreview } from "@/botcamp/components/admin/StagePreview"
import { HACKATHON_STAGES } from "@/botcamp/lib/hackathon-stages"
import { cn } from "@/botcamp/lib/utils"

interface HackathonStageControlProps {
  hackathonId: string
  hackathonSlug: string
  status: HackathonStatus
  /** From getStageWarnings, computed on the server for every stage. */
  warningsByStage: Record<HackathonStatus, string[]>
}

/**
 * Stepper for the current hackathon's stage on the admin dashboard. Any step
 * can be picked (including going back); the confirmation lists what the
 * public page will do and anything still missing for that stage.
 */
export function HackathonStageControl({
  hackathonId,
  hackathonSlug,
  status,
  warningsByStage,
}: HackathonStageControlProps) {
  const router = useRouter()
  const [target, setTarget] = useState<HackathonStatus | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentIndex = HACKATHON_STAGES.findIndex((s) => s.value === status)
  const next = HACKATHON_STAGES[currentIndex + 1]
  const targetStage = HACKATHON_STAGES.find((s) => s.value === target)
  const targetWarnings = target ? warningsByStage[target] ?? [] : []

  const openDialog = (value: HackathonStatus) => {
    if (value === status) return
    setError(null)
    setTarget(value)
  }

  const handleConfirm = async () => {
    if (!target) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/hackathons/${hackathonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Failed to change stage")
      }
      setTarget(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change stage")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-bc-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Stage
        </p>
        {next && (
          <Button size="sm" onClick={() => openDialog(next.value)}>
            Move to {next.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <ol className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {HACKATHON_STAGES.map((stage, i) => {
          const isCurrent = i === currentIndex
          const isDone = i < currentIndex
          const warningCount = warningsByStage[stage.value]?.length ?? 0
          return (
            <li key={stage.value}>
              <button
                type="button"
                onClick={() => openDialog(stage.value)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-full w-full flex-col gap-1 rounded-bc-md border px-3 py-2 text-left transition-colors",
                  isCurrent
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50",
                  isDone && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em]",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : String(i).padStart(2, "0")}
                  {isCurrent && " · Now"}
                </span>
                <span className="text-sm font-semibold">{stage.label}</span>
                {!isCurrent && !isDone && warningCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    {warningCount} to check
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Move to {targetStage?.label}?</AlertDialogTitle>
            <AlertDialogDescription>{targetStage?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          {targetWarnings.length > 0 && (
            <ul className="space-y-bc-2 rounded-bc-md border border-warning/30 bg-warning/5 p-3 text-sm">
              {targetWarnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
          {target === "DRAFT" ? (
            <p className="rounded-bc-md border border-border p-3 text-sm text-muted-foreground">
              The public page returns 404 while the hackathon is a draft.
            </p>
          ) : (
            target && <StagePreview hackathonSlug={hackathonSlug} stage={target} />
          )}
          {error && <p className="text-sm text-error">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
