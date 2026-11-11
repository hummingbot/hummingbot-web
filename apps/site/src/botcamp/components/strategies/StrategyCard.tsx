"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Star, Lock, Trophy, BadgeCheck } from "lucide-react"
import { getCohortBadgeClasses, capitalizeExchange, cn } from "@/botcamp/lib/utils"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import type { StrategyShowcase } from "@/botcamp/lib/strategy-showcase"

type StrategyType = 'AGENT' | 'SCRIPT' | 'CONTROLLER' | 'V1_STRATEGY' | 'OTHER'

const STRATEGY_TYPE_LABELS: Record<StrategyType, string> = {
  AGENT: 'Agent',
  SCRIPT: 'Script',
  CONTROLLER: 'Controller',
  V1_STRATEGY: 'V1 Strategy',
  OTHER: 'Other',
}

interface StrategyCardProps {
  strategy: {
    id: number
    slug: string
    title: string
    summary?: string | null
    tags: string[]
    exchanges: string[]
    cohort: number | null
    /** Hackathon the strategy is submitted to — renders a badge like cohort. */
    hackathon?: { slug: string; title: string } | null
    hasFiles: boolean
    videoURL: string | null
    strategyType?: StrategyType
    /** Hand-picked strategy — renders a star badge in the chip row. */
    featured?: boolean
    /** An Agent Condor can import — leads the chip row. */
    condorReady?: boolean
    /** Renders a rank chip top right; 1st place gets the gold winner glow. */
    showcase?: StrategyShowcase | null
    authors?: {
      slug?: string | null
      name: string
      avatarURL?: string | null
      profilePublic?: boolean
    }[]
  }
  hideAuthor?: boolean
  /** Replace the type/cohort badge row with the strategy's creator (avatar + name). */
  showAuthor?: boolean
  animationDelay?: number
  /** Render as div instead of Link (for embedding in custom containers) */
  asDiv?: boolean
  /** Override the default /strategies/[slug] destination. An absolute URL
   *  opens in a new tab — used for reference strategies hosted elsewhere. */
  href?: string
  /** Code & resources are behind the strategy-library paywall for this viewer. */
  locked?: boolean
  /** Rendered beside the slug in the mono header (e.g. a hackathon seat badge). */
  slugBadge?: ReactNode
}

export function StrategyCard({
  strategy,
  hideAuthor = false,
  showAuthor = false,
  animationDelay = 0,
  asDiv = false,
  href,
  locked = false,
  slugBadge,
}: StrategyCardProps) {
  const primaryAuthor = strategy.authors?.[0]
  const isWinner = strategy.showcase?.rank === 1
  // The podium shows its prize money; further down, only an honorable
  // mention is called out — never a bare amount.
  const showcaseExtra = strategy.showcase
    ? strategy.showcase.rank <= 3
      ? strategy.showcase.prize
      : strategy.showcase.honorableMention
        ? "Honorable mention"
        : null
    : null
  const authorSlug = primaryAuthor?.slug ?? null

  const content = (
    <div className="flex flex-col gap-3">
      {/* Mono breadcrumb header — @author / slug, race result on the right */}
      <div className="flex items-center gap-2 min-w-0">
        <p className="min-w-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground truncate">
          {authorSlug ? (
            <>
              <span>@{authorSlug}</span>
              <span className="text-muted-foreground/50 mx-1.5">/</span>
            </>
          ) : null}
          <span className="text-foreground/80">{strategy.slug}</span>
        </p>
        {slugBadge && <div className="shrink-0">{slugBadge}</div>}
        {strategy.showcase && (
          <span
            className={cn(
              "relative ml-auto shrink-0 inline-flex items-center gap-1 overflow-hidden px-2 py-0.5 rounded text-[11px] font-mono font-semibold border",
              isWinner
                ? "bg-primary text-primary-foreground border-primary glow-gold"
                : "bg-primary/10 text-primary border-primary/30"
            )}
          >
            {isWinner && (
              // Same light sweep as the hackathon podium (WinnersPodium).
              <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 w-1/3 -translate-x-[150%] motion-safe:animate-podium-sheen"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)" }}
                />
              </span>
            )}
            <Trophy className="relative h-3 w-3" />
            <span className="relative">{isWinner ? "Winner" : `#${strategy.showcase.rank}`}</span>
            {showcaseExtra && (
              <span className="relative font-normal opacity-80">· {showcaseExtra}</span>
            )}
          </span>
        )}
      </div>

      {/* Title + capability chips */}
      <h3 className="text-lg sm:text-xl font-semibold leading-snug">
        {strategy.title}
      </h3>

      {/* Summary (truncated) */}
      {strategy.summary && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {strategy.summary}
        </p>
      )}

      {/* Footer chip row */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {strategy.condorReady && (
          <span
            title="Approved for Condor: clone it from Condor's Hub"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-condor-gold text-condor-ink border border-condor-gold"
          >
            <BadgeCheck className="h-3 w-3" />
            Condor Ready
          </span>
        )}
        {strategy.featured && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </span>
        )}
        {strategy.strategyType && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary/10 text-secondary border border-secondary/20">
            {STRATEGY_TYPE_LABELS[strategy.strategyType]}
          </span>
        )}
        {strategy.cohort !== null && strategy.cohort !== undefined && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getCohortBadgeClasses(strategy.cohort)}`}
          >
            {strategy.cohort === 0 ? "Example" : `Cohort ${strategy.cohort}`}
          </span>
        )}
        {locked && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
            <Lock className="h-3 w-3" />
            Code & resources locked
          </span>
        )}
        {strategy.hackathon && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
            {strategy.hackathon.title}
          </span>
        )}
        {strategy.tags &&
          strategy.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"
            >
              {tag}
            </span>
          ))}
        {strategy.exchanges &&
          strategy.exchanges.slice(0, 2).map((exchange) => (
            <span
              key={exchange}
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {capitalizeExchange(exchange)}
            </span>
          ))}
        {/* Inline author display when showAuthor is on */}
        {showAuthor && !hideAuthor && primaryAuthor && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {primaryAuthor.avatarURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryAuthor.avatarURL}
                alt={primaryAuthor.name}
                className="w-4 h-4 rounded-full object-cover border border-border"
              />
            ) : (
              <span
                className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[8px] font-bold text-black"
                style={getAvatarGradient(primaryAuthor.name)}
              >
                {primaryAuthor.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate max-w-[10rem]">{primaryAuthor.name}</span>
          </span>
        )}
      </div>
    </div>
  )

  if (asDiv) {
    return <div className="p-5">{content}</div>
  }

  const destination = href ?? `/hub/${strategy.slug}`
  const isExternal = destination.startsWith("http")

  return (
    <Link
      href={destination}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "block bg-card rounded-bc-xl border border-border p-5 hover:border-primary/50 hover:bg-card/80 transition-[border-color,background-color,transform,box-shadow] hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-4",
        // The one deliberate exception to "flat by default": the showcased
        // winner glows gold so the podium reads at a glance.
        isWinner &&
          "border-primary/70 bg-primary/[0.04] shadow-[0_0_28px_-6px_hsl(var(--primary)/0.55)] hover:border-primary hover:shadow-[0_0_36px_-4px_hsl(var(--primary)/0.7)]"
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: "backwards",
      }}
    >
      {content}
    </Link>
  )
}
