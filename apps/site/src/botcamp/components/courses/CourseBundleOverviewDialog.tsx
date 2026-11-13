"use client"

import Link from "next/link"
import {
  ArrowRight,
  Bot,
  Check,
  Coins,
  GraduationCap,
  Repeat,
  Sparkles,
  Ticket,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/botcamp/components/ui/dialog"
import { Button } from "@/botcamp/components/ui/button"
import { CourseBundleDialog } from "@/botcamp/components/cohorts/CourseBundleDialog"
import { formatDuration, formatPriceCents } from "@/botcamp/lib/format"
import { accentForLevel, labelForLevel, type CourseLevel } from "@/botcamp/lib/course-level"

// Snapshot of the four bundled courses — same source of truth as
// CoursesIncluded, plus the description/highlights/duration/price detail
// this overview dialog shows. Update alongside CoursesIncluded.COURSES.
const COURSES = [
  {
    slug: "intro-to-algo-trading",
    title: "Intro to Algo Trading",
    level: "BASIC" as CourseLevel,
    description:
      "The fundamentals of algorithmic trading and how a market-making bot actually works.",
    highlights: [
      "Order types, spreads, and exchange market structure",
      "How a market-making bot places and manages orders",
      "Setting up and running your first Hummingbot instance",
    ],
    priceCents: 0,
    lessonCount: 26,
    durationMinutes: 276,
    icon: GraduationCap,
    color: "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10",
  },
  {
    slug: "market-making-strategies",
    title: "Market Making Strategies",
    level: "INTERMEDIATE" as CourseLevel,
    description:
      "Build and tune market-making strategies with real inventory and risk controls.",
    highlights: [
      "Inventory management and spread modeling",
      "Risk controls: order skew, hanging orders, stop-loss",
      "Tuning strategy parameters against live order books",
    ],
    priceCents: 20000,
    lessonCount: 25,
    durationMinutes: 476,
    icon: Coins,
    color: "text-amber-500 dark:text-amber-400 bg-amber-500/10",
  },
  {
    slug: "directional-strategies-and-hummingbot-v2-framework",
    title: "Directional Strategies & V2 Framework",
    level: "INTERMEDIATE" as CourseLevel,
    description:
      "Directional strategies and custom strategy building on the new Hummingbot V2 framework.",
    highlights: [
      "Signal-based directional strategies",
      "Position sizing and execution logic",
      "Building custom strategies on the V2 framework",
    ],
    priceCents: 20000,
    lessonCount: 24,
    durationMinutes: 302,
    icon: Bot,
    color: "text-purple-500 dark:text-purple-400 bg-purple-500/10",
  },
  {
    slug: "cross-exchange-market-making",
    title: "Cross Exchange Market Making",
    level: "ADVANCED" as CourseLevel,
    description:
      "Market make across two exchanges at once, and manage the risk that comes with it.",
    highlights: [
      "Making markets across two exchanges simultaneously",
      "Hedging and cross-venue risk management",
      "Handling latency and execution timing",
    ],
    priceCents: 20000,
    lessonCount: 13,
    durationMinutes: 290,
    icon: Repeat,
    color: "text-fuchsia-500 dark:text-fuchsia-400 bg-fuchsia-500/10",
  },
]

interface CourseBundleOverviewDialogProps {
  trigger: React.ReactNode
}

export function CourseBundleOverviewDialog({ trigger }: CourseBundleOverviewDialogProps) {
  const totalValueCents = COURSES.reduce((sum, c) => sum + c.priceCents, 0)

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl p-0 gap-0 max-h-[92vh] overflow-y-auto">
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
              Course Bundle
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-bc-tight leading-[1.05] mb-3 md:leading-(--text-4xl--line-height)">
              Four courses. One bundle.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed md:leading-(--text-lg--line-height)">
              {formatPriceCents(totalValueCents)} of instruction, 20+ hours
              total — theory, quizzes, and hands-on coding challenges, all in
              the Hummingbot framework.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 md:px-10 py-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">
            What&apos;s included
          </p>
          <div className="space-y-bc-4">
            {COURSES.map((course, index) => {
              const Icon = course.icon
              return (
                <div
                  key={course.slug}
                  className="rounded-bc-xl border border-border bg-card/40 p-5"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-bc-lg ${course.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="text-base font-semibold leading-tight">
                          {course.title}
                        </p>
                        <span className={`text-[11px] font-medium ${accentForLevel(course.level)}`}>
                          {labelForLevel(course.level)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {course.description}
                      </p>

                      <ul className="mt-3 grid gap-1.5 sm:grid-cols-1">
                        {course.highlights.map((point) => (
                          <li key={point} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                        <span>{course.lessonCount} lessons</span>
                        <span>{formatDuration(course.durationMinutes)}</span>
                        <span className="font-semibold text-foreground">
                          {formatPriceCents(course.priceCents)}
                        </span>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                        >
                          View course
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky-feeling footer with price + CTA */}
        <div className="border-t border-border bg-card/40 px-6 md:px-10 py-5">
          <div className="inline-flex items-center gap-1.5 mb-3 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            <Ticket className="h-3 w-3" />
            Reserve your Cohort 14 seat today — all four courses come free with it
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-2xl font-bold tracking-bc-tight">$400</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lifetime access to all four courses — an{" "}
                {formatPriceCents(totalValueCents)} value — plus a Cohort 14
                deposit that applies in full toward tuition.
              </p>
            </div>
            <CourseBundleDialog
              trigger={
                <Button size="lg" className="min-w-[200px]">
                  Buy the bundle
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
