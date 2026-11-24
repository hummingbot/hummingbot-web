"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { CourseBundleDialog } from "@/botcamp/components/cohorts/CourseBundleDialog"

/**
 * Promo banner: the Hummingbot Course Bundle — buy lifetime access to all
 * Botcamp self-paced courses for $400, which also acts as a Cohort 14
 * deposit applied in full to tuition. Opens the shared CourseBundleDialog.
 *
 * Used at the top of /courses and on every /courses/[slug] page so the deal
 * is impossible to miss.
 */
export function CohortDepositBanner({
  className = "",
}: {
  className?: string
}) {
  return (
    <section
      className={
        "relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 md:p-8 " +
        className
      }
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Course bundle (free with Cohort 14 deposit)
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-bc-tight leading-tight mb-2">
            All four courses, free with a $400 Cohort 14 deposit.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            The Hummingbot Course Bundle gives you lifetime access to every
            Botcamp self-paced course and reserves your Cohort 14 seat in one
            step. Your $400 applies in full toward tuition when dates are
            announced.
          </p>
        </div>
        <CourseBundleDialog
          trigger={
            <Button size="lg" className="md:w-auto">
              Reserve my seat
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          }
        />
      </div>
    </section>
  )
}
