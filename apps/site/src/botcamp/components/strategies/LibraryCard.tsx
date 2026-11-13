"use client"

import Link from "next/link"
import { ArrowUpRight, BadgeCheck, Lock, Star } from "lucide-react"
import { AvatarWithFallback } from "@/botcamp/components/ui/avatar-with-fallback"
import type { StrategyShowcase } from "@/botcamp/lib/strategy-showcase"
import { capitalizeExchange, cn } from "@/botcamp/lib/utils"
import { CandleBackdrop, RankNumeral, plainSummary } from "./StrategyCover"

type StrategyType = "AGENT" | "SCRIPT" | "CONTROLLER" | "V1_STRATEGY" | "OTHER"

const TYPE_LABELS: Record<StrategyType, string> = {
  AGENT: "Agent",
  SCRIPT: "Script",
  CONTROLLER: "Controller",
  V1_STRATEGY: "V1 Strategy",
  OTHER: "Other",
}

interface LibraryCardProps {
  strategy: {
    slug: string
    title: string
    summary: string | null
    tags: string[]
    exchanges: string[]
    cohort: number | null
    hackathon: { slug: string; title: string } | null
    strategyType: StrategyType
    featured: boolean
    condorReady: boolean
    showcase: StrategyShowcase | null
    authors: { name: string; avatarURL: string | null }[]
  }
  /** Code & resources are behind the strategy-library paywall for this viewer. */
  locked: boolean
  animationDelay?: number
}

// Where the strategy comes from, in a few words: the race finish, the
// cohort, or the hackathon it was entered in.
function provenance(strategy: LibraryCardProps["strategy"]): string | null {
  if (strategy.showcase) return strategy.showcase.hackathon.title
  if (strategy.cohort === 0) return "Example"
  if (strategy.cohort !== null) return `Cohort ${strategy.cohort}`
  return strategy.hackathon?.title ?? null
}

/** A strategy in the /strategies library: a generated cover over its name, author and summary. */
export function LibraryCard({ strategy, locked, animationDelay = 0 }: LibraryCardProps): React.JSX.Element {
  const author = strategy.authors[0]
  const summary = plainSummary(strategy.summary)
  const { showcase } = strategy
  const isWinner = showcase?.rank === 1
  const origin = provenance(strategy)

  return (
    <Link
      href={`/hub/${strategy.slug}`}
      className={cn(
        "hub-card group flex flex-col overflow-hidden rounded-bc-xl border bg-card transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-2",
        strategy.condorReady
          ? "border-border hover:border-condor-gold/60 hover:shadow-[0_18px_40px_-24px_rgb(var(--condor-gold-rgb)/0.6)]"
          : "border-border hover:border-foreground/25 hover:shadow-[0_18px_40px_-24px_rgb(0_0_0/0.8)]",
        isWinner && "border-condor-gold/60",
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: "backwards" }}
    >
      <div className="relative aspect-[16/7] overflow-hidden border-b border-border bg-[var(--cover-ink)] strategy-cover">
        <CandleBackdrop
          seed={strategy.slug}
          accent={strategy.condorReady ? "gold" : "neutral"}
          count={24}
          className="opacity-30 transition-opacity duration-500 group-hover:opacity-60"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,var(--cover-ink)_20%,transparent_70%)]"
        />

        {showcase && <RankNumeral rank={showcase.rank} size="sm" className="absolute right-4 top-3" />}

        <div className="relative flex h-full flex-col justify-between p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {strategy.condorReady && (
              <span className="inline-flex items-center gap-1 rounded bg-condor-gold px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-condor-ink">
                <BadgeCheck className="h-3 w-3" />
                Condor Ready
              </span>
            )}
            <span className="rounded bg-[hsl(var(--cover-fg)/0.1)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--cover-fg)/0.75)]">
              {TYPE_LABELS[strategy.strategyType]}
            </span>
            {strategy.featured && !showcase && (
              <Star className="h-3.5 w-3.5 fill-condor-gold text-condor-gold" aria-label="Featured" />
            )}
          </div>
          {strategy.exchanges.length > 0 && (
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--cover-fg)/0.6)]">
              {strategy.exchanges.map(capitalizeExchange).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 font-semibold leading-snug tracking-[-0.01em]">{strategy.title}</h2>
        {summary && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          {author ? (
            <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <AvatarWithFallback name={author.name} src={author.avatarURL} size="xs" />
              <span className="truncate">
                {author.name}
                {strategy.authors.length > 1 && ` +${strategy.authors.length - 1}`}
              </span>
            </span>
          ) : (
            <span />
          )}
          <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {locked && <Lock className="h-3 w-3" aria-label="Code locked" />}
            {origin && <span className="max-w-[9rem] truncate">{origin}</span>}
            <ArrowUpRight className="h-3.5 w-3.5 text-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </span>
        </div>
      </div>
    </Link>
  )
}
