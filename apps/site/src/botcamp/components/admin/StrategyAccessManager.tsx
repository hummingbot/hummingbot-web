"use client"

import { useState } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
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
import { Loader2, Trash2, Plus, KeyRound } from "lucide-react"

export interface StrategyAccessGrant {
  id: string
  status: string
  expiresAt: string | null
  purchasedAt: string
  stripeSubscriptionId: string | null
}

interface StrategyAccessManagerProps {
  userId: string
  initialGrant: StrategyAccessGrant | null
  onError?: (error: string) => void
}

export function StrategyAccessManager({
  userId,
  initialGrant,
  onError,
}: StrategyAccessManagerProps) {
  const [grant, setGrant] = useState<StrategyAccessGrant | null>(initialGrant)
  const [isGranting, setIsGranting] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)

  const isStripeManaged = !!grant?.stripeSubscriptionId

  const handleGrant = async () => {
    setIsGranting(true)

    try {
      const response = await fetch("/api/admin/strategy-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to grant strategy access")
      }

      const { data } = await response.json()
      setGrant(data)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to grant strategy access")
    } finally {
      setIsGranting(false)
    }
  }

  const handleRevoke = async () => {
    if (!grant) return

    setIsRevoking(true)

    try {
      const response = await fetch(`/api/admin/strategy-access/${grant.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to revoke strategy access")
      }

      setGrant(null)
      setShowRevokeDialog(false)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to revoke strategy access")
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Strategy Access
          </CardTitle>
          <CardDescription>
            Grant access to the strategy library outside of a paid subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          {grant ? (
            <div className="flex items-center justify-between p-3 rounded-bc-lg border bg-muted/50">
              <div>
                <span className="font-medium">
                  {isStripeManaged ? "Active via subscription" : "Active (manually granted)"}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {grant.expiresAt
                    ? `Renews/expires ${new Date(grant.expiresAt).toLocaleDateString()}`
                    : "No expiration"}
                </p>
              </div>
              {isStripeManaged ? (
                <span className="text-xs text-muted-foreground">Manage via Stripe</span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRevokeDialog(true)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-bc-3">
              <p className="text-sm text-muted-foreground">No strategy access granted</p>
              <Button type="button" onClick={handleGrant} disabled={isGranting}>
                {isGranting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Grant Access
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Strategy Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this user&apos;s strategy library access?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
