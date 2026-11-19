"use client"

import { useEffect, useState } from "react"
import { formatPoints } from "@/botcamp/lib/hackathon-leaderboard"

interface AgentStickyBarProps {
  title: string
  rank: number
  fieldSize: number
  score: number
  color: string
  // Show the bar once the page has scrolled past this share of the viewport
  // (roughly when the hero's headline numbers leave the screen).
  threshold?: number
}

/**
 * Compact bar pinned under the site header on an agent's page once its hero
 * has scrolled away — keeps who you're reading about, and where they stand,
 * in view. Mirrors the hackathon page's compact countdown bar.
 */
export function AgentStickyBar({ title, rank, fieldSize, score, color, threshold = 0.55 }: AgentStickyBarProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * threshold)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [threshold])

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-16 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 max-w-5xl h-11 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-sm font-bold tabular-nums" style={{ color }}>
            #{rank}
          </span>
          <span className="text-sm font-semibold tracking-bc-tight text-foreground truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs sm:text-sm tabular-nums shrink-0">
          <span className="uppercase tracking-[0.14em] text-muted-foreground text-[10px] sm:text-[11px]">
            Score
          </span>
          <span className="font-bold text-foreground">{formatPoints(score)}</span>
          <span className="text-muted-foreground text-[11px]">/ {fieldSize}</span>
        </div>
      </div>
    </div>
  )
}
