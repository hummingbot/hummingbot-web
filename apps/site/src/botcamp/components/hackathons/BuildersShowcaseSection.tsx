import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { eyebrow } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { BuildersMarquee } from "./BuildersMarquee"
import type { ShowcaseBuilder } from "./BuilderShowcaseCard"

/**
 * "What others are building" — eyebrow + heading + View-all link over the
 * bi-directional builder marquee. Shared by the hackathon landing page and
 * the dashboard racing hub so both surfaces use the exact same showcase.
 */
export function BuildersShowcaseSection({
  builders,
  count,
  viewAllHref,
  title,
  eyebrowLabel,
  subtitle,
  headingClassName,
  emptyMessage = "Builders who register will show up here.",
}: {
  builders: ShowcaseBuilder[]
  count: number
  viewAllHref: string
  title?: string
  eyebrowLabel?: string
  subtitle?: string
  headingClassName?: string
  emptyMessage?: string
}) {
  const viewAll = count > 0 && (
    <Link
      href={viewAllHref}
      className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary hover:underline"
    >
      View all
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
  const hasHeading = !!(eyebrowLabel || title || subtitle)

  return (
    <div>
      {(hasHeading || viewAll) && (
        <div className={cn("mb-5 flex gap-4", hasHeading ? "items-end justify-between" : "justify-end")}>
          {hasHeading && (
            <div>
              {eyebrowLabel && <p className={eyebrow}>{eyebrowLabel}</p>}
              {title && (
                <h3 className={cn("font-bold tracking-bc-tight", headingClassName ?? "text-xl md:text-2xl")}>
                  {title}
                </h3>
              )}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          {viewAll}
        </div>
      )}
      {builders.length > 0 ? (
        <BuildersMarquee builders={builders} />
      ) : (
        <div className="rounded-bc-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}
