"use client"

import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { CourseBundleDialog } from "@/botcamp/components/cohorts/CourseBundleDialog"
import {
  Award,
  Calendar,
  Clock,
  Coins,
  ArrowRight,
  Zap,
  Bot,
  Users,
} from "lucide-react"

const WHATS_NEW = [
  {
    icon: Coins,
    title: "Professional Market Making",
    description: "Master strategies like cross-exchange market making, funding rate arbitrage, concentrated liquidity LP strategies, & more",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: Bot,
    title: "No Coding Required",
    description: "Design your custom algorithmic strategy and deploy it as a Hummingbot AI Agent - no coding experience required!",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    icon: Award,
    title: "Hummingbot Certification",
    description: "Submit a working strategy to earn the official Hummingbot Certification — join a public list of certified developers recognized across the community.",
    color: "bg-yellow-500/10 text-yellow-500",
    href: "https://hummingbot.org/community/certification/",
  },
]

const INTEREST_THRESHOLD = 20

interface Cohort14HeroProps {
  /** Optional cohort number override — defaults to 14. */
  cohortNumber?: number
  /** Number of paid deposits/enrollments registered so far. */
  registeredCount?: number
}

export function Cohort14Hero({ cohortNumber = 14, registeredCount }: Cohort14HeroProps) {
  return (
    <div
      className="relative rounded-2xl motion-safe:animate-bh-border-shimmer"
      style={{
        padding: "1.5px",
        background:
          "linear-gradient(115deg, rgba(247,201,72,.9), rgba(247,201,72,.05) 30%, rgba(255,255,255,.06) 55%, rgba(247,201,72,.5))",
        backgroundSize: "220% 220%",
      }}
    >
      <Card className="relative overflow-hidden border-0 rounded-[15px] bg-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

        <CardContent className="p-8 relative z-10">
          <div className="grid lg:grid-cols-[1fr_280px] gap-8">
            {/* Left - Main content */}
            <div className="relative space-y-bc-6">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-green-500/20 text-green-500 dark:text-green-400 border-green-500/30">
                  <Zap className="h-3 w-3 mr-1" />
                  Reserving Seats
                </Badge>
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  1-2 cohorts per year
                </Badge>
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  Max 40 students
                </Badge>
              </div>

              <div className="relative">
                {/* Spotlight — fixed, unanimated glow behind the headline */}
                <div
                  className="absolute -z-10 pointer-events-none"
                  style={{
                    top: "-30px",
                    left: "20px",
                    width: "420px",
                    height: "220px",
                    background:
                      "radial-gradient(closest-side, rgba(247,201,72,.16), transparent)",
                  }}
                />
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  Cohort {cohortNumber}:{" "}
                  <span
                    className="motion-safe:animate-bh-text-shimmer"
                    style={{
                      background: "linear-gradient(90deg, #F7C948, #ffe08a, #F7C948)",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    Coming soon
                  </span>
                </h2>
                <p className="text-muted-foreground text-lg">
                  Learn the algorithmic trading strategies used by Wintermute, Jump Trading,
                  and other professional market makers. Build AI agents that run them across
                  any CEX or DEX and self-improve. No coding experience required!
                </p>
              </div>

              {/* What's New */}
              <div className="grid sm:grid-cols-3 gap-4">
                {WHATS_NEW.map((item) => {
                  const inner = (
                    <>
                      <div className={`p-2 rounded-bc-lg ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </>
                  )
                  const cls =
                    "flex items-start gap-3 p-4 rounded-bc-lg bg-muted/40 border border-border"
                  if (item.href) {
                    return (
                      <a
                        key={item.title}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${cls} transition-colors hover:border-primary/40`}
                      >
                        {inner}
                      </a>
                    )
                  }
                  return (
                    <div key={item.title} className={cls}>
                      {inner}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right - CTA */}
            <div className="flex flex-col items-center justify-center lg:border-l lg:pl-8">
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium self-center">
                  <Users className="h-3.5 w-3.5" />
                  Schedules at {INTEREST_THRESHOLD}+ confirmed
                </div>

                <CourseBundleDialog
                  trigger={
                    <Button size="lg" className="relative w-full overflow-hidden">
                      Reserve my seat — $400
                      <ArrowRight className="ml-2 h-5 w-5" />
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-2/5 pointer-events-none motion-safe:animate-bh-sheen"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)",
                        }}
                      />
                    </Button>
                  }
                />
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4 max-w-[16rem]">
                $400 deposit reserves your seat and unlocks all four courses.
                Cohort {cohortNumber} schedules at {INTEREST_THRESHOLD}+ deposits.
              </p>

              {typeof registeredCount === "number" && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium mt-3">
                  <Clock className="h-3.5 w-3.5" />
                  {registeredCount} builders confirmed
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
