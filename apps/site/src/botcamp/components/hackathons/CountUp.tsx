"use client"

import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  value: number
  decimals?: number
  // Prefix positive values with "+" (P&L deltas).
  signed?: boolean
  suffix?: string
  durationMs?: number
  // Count up as soon as it mounts (for numbers already on screen, e.g. in a
  // hero) instead of waiting to be scrolled into view.
  playOnMount?: boolean
}

function format(value: number, decimals: number, signed: boolean, suffix: string): string {
  // Sign the number as displayed: a tiny loss rounds to -0, which would
  // otherwise print as "+-0.00".
  const shown = Number(value.toFixed(decimals)) || 0
  const sign = signed && shown >= 0 ? "+" : ""
  const body = shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return `${sign}${body}${suffix}`
}

/**
 * Renders `value`, counting up to it from zero the first time it scrolls
 * into view. Server-renders the final value, so it reads correctly without
 * JS; the reset to zero happens on mount while the number is still below the
 * fold, so there's no visible flash. Skipped entirely for reduced motion.
 */
export function CountUp({
  value,
  decimals = 0,
  signed = false,
  suffix = "",
  durationMs = 900,
  playOnMount = false,
}: CountUpProps) {
  const [displayed, setDisplayed] = useState(value)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplayed(value * eased)
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    if (playOnMount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
      setDisplayed(0)
      run()
      return () => cancelAnimationFrame(frame)
    }

    // Already on screen at mount (e.g. deep link to #leaderboard): leave it.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) return

    setDisplayed(0)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        run()
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, durationMs, playOnMount])

  return <span ref={ref}>{format(displayed, decimals, signed, suffix)}</span>
}
