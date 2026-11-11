"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Code2,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageCircle,
  Sparkles,
  Ticket,
  Unlock,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/botcamp/components/ui/dialog"
import { Button } from "@/botcamp/components/ui/button"
import { formatPriceCents } from "@/botcamp/lib/format"
import {
  BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER,
  BUNDLE_PRICE_CENTS,
  BUNDLE_PRODUCT_NAME,
} from "@/botcamp/lib/bundle"

const WHAT_YOU_GET = [
  {
    icon: Ticket,
    title: "Cohort 14 seat reservation",
    body: "Your $400 holds your spot and applies in full toward Cohort 14 tuition. Scheduled for late 2026 — locks in once we hit 20+ deposits.",
  },
  {
    icon: GraduationCap,
    title: "Lifetime access to all four courses",
    body: "Every Botcamp self-paced course, yours to keep — even if you decide not to enroll in the cohort.",
  },
  {
    icon: Clock,
    title: "4+ hours of interactive learning per course",
    body: "Theory of algorithmic trading and market making, taught the way professional desks teach it.",
  },
  {
    icon: HelpCircle,
    title: "Quizzes after every lesson",
    body: "Short knowledge checks so the material actually lands — not just passive video.",
  },
  {
    icon: Code2,
    title: "Hands-on coding challenges",
    body: "Build real strategies in the Hummingbot framework with progressive difficulty and instant feedback.",
  },
  {
    icon: MessageCircle,
    title: "Early access to private Discord",
    body: "Member-only Botcamp channels plus the Cohort 14 channel from day one — connect with builders and instructors before the cohort kicks off.",
  },
  {
    icon: Unlock,
    title: "Full access to the Strategies Library",
    body: "Every certified strategy's code and resources, unlocked automatically — a $20/year value included free as a cohort member.",
  },
] as const

interface CourseBundleDialogProps {
  trigger: React.ReactNode
}

export function CourseBundleDialog({ trigger }: CourseBundleDialogProps) {
  const router = useRouter()
  // No sign-in on this site: always the signed-out view.
  const session = null
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cohortLandingHref = "/cohorts/cohort13/landing"

  // Botcamp starts a Stripe checkout via POST /api/checkout, which answers a
  // signed-out visitor with 401 and sends them to sign up. Nobody is signed in
  // here, so the button goes straight to that sign-up step.
  const handleBuy = () => {
    setIsLoading(true)
    setError(null)
    const callbackUrl = encodeURIComponent(window.location.pathname)
    router.push(`/signup?callbackUrl=${callbackUrl}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[92vh] overflow-y-auto">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-amber-400 to-primary" />

        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-card to-background px-6 md:px-10 pt-8 pb-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.6) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div className="relative">
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              {BUNDLE_PRODUCT_NAME}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-bc-tight leading-[1.05] mb-3 md:leading-(--text-4xl--line-height)">
              Reserve your Cohort {BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} seat —
              and start learning today.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed md:leading-(--text-lg--line-height)">
              One purchase, two things: lifetime access to all four Botcamp
              self-paced courses, plus a Cohort {BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER}{" "}
              deposit that applies in full toward tuition.{" "}
              <Link
                href={cohortLandingHref}
                className="text-primary hover:underline whitespace-nowrap"
              >
                See what Cohort 13 looked like →
              </Link>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 md:px-10 py-8 space-y-bc-10">
          {/* What you get */}
          <section>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">
              What you get
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {WHAT_YOU_GET.map((item) => {
                const Icon = item.icon
                return (
                  <li
                    key={item.title}
                    className="flex items-start gap-3 rounded-bc-lg border border-border bg-card/40 p-4"
                  >
                    <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-bc-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        {item.body}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* How the deposit works */}
          <section className="rounded-bc-lg border border-primary/30 bg-primary/5 p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
              How the deposit works
            </p>
            <ul className="space-y-bc-2 text-sm leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <span>
                  Pay <strong>{formatPriceCents(BUNDLE_PRICE_CENTS)}</strong>{" "}
                  today — receive all four courses immediately.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <span>
                  Cohort {BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} schedules once
                  20+ deposits are in. We email you the dates and tuition
                  invoice when it&apos;s ready.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <span>
                  Your{" "}
                  <strong>{formatPriceCents(BUNDLE_PRICE_CENTS)}</strong>{" "}
                  applies dollar-for-dollar toward Cohort{" "}
                  {BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} tuition ($2,000+ early
                  bird pricing).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <span>
                  Non-refundable, but the courses are yours for life — even if
                  you decide not to enroll in the cohort.
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Sticky-feeling footer with price + CTA */}
        <div className="border-t border-border bg-card/40 px-6 md:px-10 py-5">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-2xl font-bold tracking-bc-tight">
                {formatPriceCents(BUNDLE_PRICE_CENTS)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                One-time. Non-refundable. Applies to Cohort{" "}
                {BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} tuition.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                onClick={handleBuy}
                disabled={isLoading}
                className="min-w-[200px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : session ? (
                  <>
                    Buy bundle — {formatPriceCents(BUNDLE_PRICE_CENTS)}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Sign up to buy
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
