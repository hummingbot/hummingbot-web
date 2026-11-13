"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { Loader2 } from "lucide-react"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

// Mirrors src/lib/strategy-access.ts's INACTIVE_SUBSCRIPTION_STATUSES — kept
// as a local literal since that module also imports Prisma, which can't be
// bundled into this client component.
const INACTIVE_STATUSES = ["canceled", "unpaid", "incomplete_expired"]

export interface StrategySubscriptionGrant {
  status: string
  cancelAtPeriodEnd: boolean
  expiresAt: string | null
  stripeCustomerId: string | null
}

interface StrategySubscriptionCardProps {
  grant: StrategySubscriptionGrant | null
}

export function StrategySubscriptionCard({ grant }: StrategySubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleManage = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to open billing portal")
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal")
      setIsLoading(false)
    }
  }

  const isActive =
    !!grant &&
    !INACTIVE_STATUSES.includes(grant.status) &&
    (grant.expiresAt === null || new Date(grant.expiresAt) > new Date())
  const expiresLabel = grant?.expiresAt ? new Date(grant.expiresAt).toLocaleDateString() : null
  const isManual = !!grant && !grant.stripeCustomerId

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Library</CardTitle>
        <CardDescription>
          Access to every certified strategy&apos;s code and resources.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {!grant && (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have an active subscription.{" "}
            <Link href="/strategies" className="text-primary hover:underline">
              Browse strategies
            </Link>{" "}
            to unlock the full library.
          </p>
        )}

        {grant && isActive && isManual && (
          <p className="text-sm">
            <span className="font-medium text-green-500">Active</span> — access
            granted{expiresLabel ? ` until ${expiresLabel}` : ""}.
          </p>
        )}

        {grant && isActive && !isManual && !grant.cancelAtPeriodEnd && (
          <p className="text-sm">
            <span className="font-medium text-green-500">Active</span> — renews
            automatically on {expiresLabel}.
          </p>
        )}

        {grant && isActive && !isManual && grant.cancelAtPeriodEnd && (
          <p className="text-sm">
            <span className="font-medium text-amber-500">Canceling</span> —
            access continues until {expiresLabel}, then won&apos;t renew.
          </p>
        )}

        {grant && !isActive && (
          <p className="text-sm text-muted-foreground">
            No active subscription.{" "}
            <Link href="/strategies" className="text-primary hover:underline">
              Resubscribe
            </Link>{" "}
            to unlock the full library again.
          </p>
        )}

        {grant && !isManual && (
          <ReadOnlyHint><Button variant="outline" onClick={handleManage} disabled>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening…
              </>
            ) : (
              "Manage subscription"
            )}
          </Button></ReadOnlyHint>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
