"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"

interface CollapsibleDescriptionProps {
  summary: string | null
  details: string | null
  /** Pixel height at which the section starts in its collapsed state. */
  collapsedHeight?: number
}

/**
 * Renders a strategy's summary + markdown details with a Show more / Show less
 * toggle when the rendered content exceeds the collapsed height. Uses a
 * ResizeObserver so the threshold is re-evaluated as images and markdown
 * settle in.
 */
export function CollapsibleDescription({
  summary,
  details,
  collapsedHeight = 320,
}: CollapsibleDescriptionProps) {
  const [expanded, setExpanded] = useState(false)
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const measure = () => setContentHeight(el.scrollHeight)
    measure()

    // Watch for late layout changes (markdown rendering, images loading, fonts).
    const ro = new ResizeObserver(measure)
    ro.observe(el)

    // Re-measure when any descendant <img> finishes loading.
    const imgs = el.querySelectorAll("img")
    const onImgLoad = () => measure()
    imgs.forEach((img) => img.addEventListener("load", onImgLoad))

    return () => {
      ro.disconnect()
      imgs.forEach((img) => img.removeEventListener("load", onImgLoad))
    }
  }, [summary, details])

  if (!summary && !details) return null

  const needsCollapse = contentHeight !== null && contentHeight > collapsedHeight + 40
  const clamp = needsCollapse && !expanded

  return (
    <section className="mb-6">
      <div
        className="relative overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{
          maxHeight: clamp ? `${collapsedHeight}px` : `${contentHeight ?? 0}px`,
        }}
      >
        <div ref={contentRef}>
          {summary && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-3">Summary</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            </div>
          )}

          {details && (
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownContent content={details} />
            </div>
          )}
        </div>

        {clamp && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent"
            aria-hidden
          />
        )}
      </div>

      {needsCollapse && (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <>
                Show less
                <ChevronUp className="h-4 w-4 ml-1.5" />
              </>
            ) : (
              <>
                Show more
                <ChevronDown className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  )
}
