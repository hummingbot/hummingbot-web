"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, BadgeCheck, Loader2, Lock, Sparkles } from "lucide-react"
import { Dialog, DialogContent } from "@/botcamp/components/ui/dialog"
import { Button } from "@/botcamp/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/botcamp/components/ui/radio-group"
import { formatPriceCents } from "@/botcamp/lib/format"
import { STRATEGY_UNLOCK_PRICE_CENTS } from "@/botcamp/lib/strategy-unlock"
import { BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER, BUNDLE_PRICE_CENTS } from "@/botcamp/lib/bundle"
import { cn } from "@/botcamp/lib/utils"

const WHAT_YOU_GET = [
  {
    icon: BadgeCheck,
    title: "Real code from Certified Builders",
    body: "The actual scripts, controllers, and files that earned their author a Botcamp certification — not toy examples.",
  },
  {
    icon: Sparkles,
    title: "New strategies as they're certified",
    body: "Anything certified while your access is active is included automatically.",
  },
] as const

type PlanKey = "course-bundle" | "strategy-unlock"

// Set on the sign-in callback, so the person lands back on this page with the
// dialog open on the plan they picked.
const UNLOCK_PARAM = "unlock"

const PLANS: Array<{
  key: PlanKey
  title: string
  priceLabel: string
  body: string
}> = [
  {
    key: "course-bundle",
    title: "Course bundle",
    priceLabel: formatPriceCents(BUNDLE_PRICE_CENTS),
    body: `Lifetime access to the Strategy Library, plus all four self-paced courses and a Cohort ${BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} tuition credit.`,
  },
  {
    key: "strategy-unlock",
    title: "Annual strategies plan",
    priceLabel: `${formatPriceCents(STRATEGY_UNLOCK_PRICE_CENTS)}/yr`,
    body: "Strategy Library access only. Renews automatically every year — cancel anytime.",
  },
]

interface UnlockStrategiesButtonProps {
  label?: string
  className?: string
  /** Adds a persistent glow + light sweep so the CTA stands out at a glance
   *  (used for the top-of-page nav button, not the inline paywall ones). */
  shine?: boolean
}

export function UnlockStrategiesButton({
  label = "Unlock all strategies",
  className,
  shine = false,
}: UnlockStrategiesButtonProps) {
  const router = useRouter()
  // No sign-in on this site: always the signed-out view. (Botcamp also
  // reopens the dialog after sign-in and starts a Stripe checkout via
  // POST /api/checkout; neither can happen signed out.)
  const session = null
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState<PlanKey>("strategy-unlock")
  const [isLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Anyone can open the dialog and compare the plans; signing in is asked
  // for at Continue, since checkout needs an account.
  const handleTriggerClick = () => {
    setError(null)
    setOpen(true)
  }

  const handleBuy = () => {
    const url = new URL(window.location.href)
    url.searchParams.set(UNLOCK_PARAM, plan)
    const callbackUrl = encodeURIComponent(`${url.pathname}${url.search}`)
    router.push(`/signin?callbackUrl=${callbackUrl}`)
  }

  const selectedPlan = PLANS.find((p) => p.key === plan)!

  return (
    <div className="inline-flex flex-col">
      <div className={cn(shine && "relative inline-flex overflow-hidden rounded-bc-md")}>
        {shine && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 z-20 w-2/5 pointer-events-none motion-safe:animate-bh-sheen"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent)",
            }}
          />
        )}
        <Button
          onClick={handleTriggerClick}
          className={cn(
            shine && "relative shadow-[0_0_20px_rgba(255,106,26,.6)] motion-safe:animate-pulse-glow",
            className
          )}
        >
          {shine && <Lock className="mr-2 h-4 w-4" />}
          {label}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-amber-400 to-primary" />

          {/* Hero */}
          <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-background px-6 pt-7 pb-6">
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-2">
              <Lock className="h-3.5 w-3.5" />
              Strategy Library Access
            </p>
            <h2 className="text-2xl font-bold tracking-bc-tight leading-tight">
              Purchase the course bundle or subscribe to the annual strategies plan
            </h2>
          </div>

          {/* What you get */}
          <div className="px-6 pt-6 space-y-bc-4">
            {WHAT_YOU_GET.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-bc-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {item.body}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Plan selector */}
          <div className="px-6 py-6">
            <RadioGroup value={plan} onValueChange={(v) => setPlan(v as PlanKey)} className="gap-3">
              {PLANS.map((p) => (
                <label
                  key={p.key}
                  htmlFor={`plan-${p.key}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-bc-lg border p-4 transition-colors",
                    plan === p.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <RadioGroupItem value={p.key} id={`plan-${p.key}`} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold leading-tight">{p.title}</p>
                      <p className="text-sm font-bold tracking-bc-tight whitespace-nowrap">{p.priceLabel}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{p.body}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Footer with price + CTA */}
          <div className="border-t border-border bg-card/40 px-6 py-5">
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-bold tracking-bc-tight">{selectedPlan.priceLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan === "course-bundle"
                    ? `One-time, non-refundable. Credits toward Cohort ${BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} tuition if you enroll.`
                    : "Per year. Renews automatically — cancel anytime."}
                </p>
              </div>
              <Button onClick={handleBuy} disabled={isLoading} className="min-w-[160px]">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    {session ? "Continue to payment" : "Sign in to continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
