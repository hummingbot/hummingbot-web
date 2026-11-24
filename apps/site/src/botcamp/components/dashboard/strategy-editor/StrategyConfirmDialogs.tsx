"use client"

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
import { Loader2 } from "lucide-react"

interface StrategyConfirmDialogsProps {
  // Submit dialog
  showSubmitDialog: boolean
  onSubmitDialogChange: (open: boolean) => void
  isSubmitting: boolean
  onSubmit: () => void
  // Certify dialog
  showCertifyDialog: boolean
  onCertifyDialogChange: (open: boolean) => void
  isCertifying: boolean
  onCertify: () => void
  // Discard dialog
  showDiscardDialog: boolean
  onDiscardDialogChange: (open: boolean) => void
  isDiscarding: boolean
  onDiscard: () => void
  // Apply to hackathon dialog
  showApplyHackathonDialog: boolean
  onApplyHackathonDialogChange: (open: boolean) => void
  hackathonTitle: string | null
  onApplyToHackathon: () => void
}

export function StrategyConfirmDialogs({
  showSubmitDialog,
  onSubmitDialogChange,
  isSubmitting,
  onSubmit,
  showCertifyDialog,
  onCertifyDialogChange,
  isCertifying,
  onCertify,
  showDiscardDialog,
  onDiscardDialogChange,
  isDiscarding,
  onDiscard,
  showApplyHackathonDialog,
  onApplyHackathonDialogChange,
  hackathonTitle,
  onApplyToHackathon,
}: StrategyConfirmDialogsProps) {
  return (
    <>
      {/* Submit for Review Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={onSubmitDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for review?</AlertDialogTitle>
            <AlertDialogDescription>
              Your strategy will be reviewed by an admin. You can still make
              changes while waiting for approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Review"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Certify Strategy Confirmation Dialog */}
      <AlertDialog open={showCertifyDialog} onOpenChange={onCertifyDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Certify your strategy?</AlertDialogTitle>
            <AlertDialogDescription>
              Once certified, your strategy content will be locked and you will
              only be able to change the visibility setting. You will receive
              your certification badge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCertifying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onCertify}
              disabled={isCertifying}
              className="bg-metric-purple hover:bg-metric-purple/90"
            >
              {isCertifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Certifying...
                </>
              ) : (
                "Certify Strategy"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Draft Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={onDiscardDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your draft strategy and all
              associated files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDiscarding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDiscard}
              disabled={isDiscarding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDiscarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discarding...
                </>
              ) : (
                "Discard Draft"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply to Hackathon Prompt — submitting for review only sends the
          strategy to admin review, it doesn't apply it anywhere. */}
      <AlertDialog open={showApplyHackathonDialog} onOpenChange={onApplyHackathonDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this strategy to a hackathon?</AlertDialogTitle>
            <AlertDialogDescription>
              Your strategy was created and submitted for review, but that&apos;s
              not the same as applying to a hackathon. {hackathonTitle} is
              currently accepting applications — want to apply this strategy
              to it now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={onApplyToHackathon}>
              Apply to Hackathon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
