"use client"

import Link from "next/link"
import { cn } from "@/botcamp/lib/utils"

interface StrategyBreadcrumbProps {
  author?: { slug: string; name: string } | null
  /** Strategy slug shown as the final segment. */
  strategySlug: string
  className?: string
}

/**
 * ClawHub-style breadcrumb: `strategies / @author / strategy-slug`.
 * Each non-current segment is a link; the final segment is muted text.
 * Ported from Botcamp: "strategies" links to this site's library (/hub).
 */
export function StrategyBreadcrumb({
  author,
  strategySlug,
  className,
}: StrategyBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "font-mono text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap",
        className,
      )}
    >
      <Link
        href="/hub"
        className="hover:text-foreground transition-colors"
      >
        strategies
      </Link>
      {author && (
        <>
          <span className="text-muted-foreground/50">/</span>
          <Link
            href={`/builders/${author.slug}`}
            className="hover:text-foreground transition-colors truncate"
            title={author.name}
          >
            @{author.slug}
          </Link>
        </>
      )}
      <span className="text-muted-foreground/50">/</span>
      <span className="text-foreground/80 truncate" title={strategySlug}>
        {strategySlug}
      </span>
    </nav>
  )
}
