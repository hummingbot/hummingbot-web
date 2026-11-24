"use client"

import { cn } from "@/botcamp/lib/utils"
import { BuilderShowcaseCard, type ShowcaseBuilder } from "./BuilderShowcaseCard"

/**
 * Bi-directional auto-scroll showcase (openclaw-style): two rows that
 * drift in opposite directions, fade out at both edges, and pause on
 * hover. Falls back to a static wrapped grid when there aren't enough
 * cards to loop convincingly.
 */
export function BuildersMarquee({ builders }: { builders: ShowcaseBuilder[] }) {
  // Need enough cards for a seamless loop; otherwise render a plain grid.
  if (builders.length < 6) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {builders.map((b) => (
          <BuilderShowcaseCard key={b.id} builder={b} />
        ))}
      </div>
    )
  }

  // Split into two rows so they can scroll in opposite directions.
  const mid = Math.ceil(builders.length / 2)
  const rowA = builders.slice(0, mid)
  const rowB = builders.slice(mid)

  return (
    <div className="flex flex-col gap-4 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <MarqueeRow builders={rowA} direction="left" />
      <MarqueeRow builders={rowB} direction="right" />
    </div>
  )
}

function MarqueeRow({
  builders,
  direction,
}: {
  builders: ShowcaseBuilder[]
  direction: "left" | "right"
}) {
  // Duplicate the set so the -50% translate loops seamlessly.
  const doubled = [...builders, ...builders]
  return (
    <div className="group flex overflow-hidden">
      <div
        className={cn(
          "flex w-max shrink-0 gap-4 pr-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none",
          direction === "left" ? "animate-marquee" : "animate-marquee-reverse",
        )}
      >
        {doubled.map((b, i) => (
          <div key={`${b.id}-${i}`} className="w-[300px] shrink-0 sm:w-[340px]">
            <BuilderShowcaseCard builder={b} />
          </div>
        ))}
      </div>
    </div>
  )
}
