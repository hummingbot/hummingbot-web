"use client"

import { Button } from "@/botcamp/components/ui/button"
import { CourseBundleDialog } from "@/botcamp/components/cohorts/CourseBundleDialog"
import { event } from "@/botcamp/lib/gtag"

interface BotcampNumbersProps {
  totalCohorts: number
  totalMembers: number
  certifiedStrategies: number
  telegramLink: string
}

export function BotcampNumbers({
  totalCohorts,
  totalMembers,
  certifiedStrategies,
  telegramLink,
}: BotcampNumbersProps) {
  const handleTelegramClick = () => {
    event({
      action: "click",
      category: "community",
      label: "telegram_cta",
    })
  }

  return (
    <section className="w-full py-12 md:py-24 bg-muted/30">
      <div className="container px-4 md:px-6 mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-bc-tight text-foreground">
            Botcamp by the Numbers
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto mt-3">
            Join our growing community of algorithmic traders and market makers from around the world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border p-7 text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground">{totalCohorts}</div>
            <div className="text-sm font-medium text-foreground mt-2">Cohorts Completed</div>
            <p className="text-xs text-muted-foreground mt-1">Botcamp cohorts conducted since 2022</p>
          </div>
          <div className="rounded-2xl border border-border p-7 text-center">
            <div className="text-4xl md:text-5xl font-bold text-purple-500 dark:text-purple-400">
              {totalMembers}
            </div>
            <div className="text-sm font-medium text-foreground mt-2">Members</div>
            <p className="text-xs text-muted-foreground mt-1">Traders trained in Botcamp cohorts</p>
          </div>
          <div className="rounded-2xl border border-border p-7 text-center">
            <div className="text-4xl md:text-5xl font-bold text-green-500 dark:text-green-400">
              {certifiedStrategies}
            </div>
            <div className="text-sm font-medium text-foreground mt-2">Certified Strategies</div>
            <p className="text-xs text-muted-foreground mt-1">Certified by Hummingbot Foundation</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <span className="text-sm text-muted-foreground">Ready to join them in Cohort 14?</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CourseBundleDialog
              trigger={
                <Button className="relative overflow-hidden">
                  Reserve my seat — $400
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
            <Button variant="outline" asChild onClick={handleTelegramClick}>
              <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                Join Telegram
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
