"use client"

import { useEffect, useRef, useState } from "react"

interface EditionYearProps {
  /** What to show, e.g. "2026" after the race or "Coming Soon" before it. */
  text: string
  /** Read by screen readers instead of the bare characters, e.g. "Agent Builders Cup 2026". */
  label: string
  /** Tailwind font-size class; the default suits a four-digit year. */
  sizeClassName?: string
}

/**
 * The post-race edition year. It stays hidden until it scrolls into view,
 * then its digits land one by one and the whole number flares gold — a
 * one-off moment, not tied to scroll position. With reduced motion (or no
 * JS) it simply renders in place.
 */
export function EditionYear({
  text,
  label,
  sizeClassName = "text-[clamp(8rem,32vw,28rem)]",
}: EditionYearProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  // Starts "waiting" — already hidden in the server HTML (via CSS, only when
  // motion is allowed), so it never flashes before its entrance. "shown"
  // plays the entrance; reduced motion skips straight to "idle".
  const [state, setState] = useState<"idle" | "waiting" | "shown">("waiting")

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
      setState("idle")
      return
    }
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown")
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const chars = text.split("")
  // Characters gather toward the middle; longer text spreads less per step.
  const center = (chars.length - 1) / 2
  const spread = chars.length <= 4 ? "0.35em" : "0.12em"

  return (
    <p
      ref={ref}
      aria-label={label}
      data-year={state}
      className={`edition-year select-none text-center font-monoton leading-none ${sizeClassName}`}
      style={{ ["--c" as string]: center, ["--s" as string]: spread }}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className="edition-year-digit inline-block whitespace-pre"
          style={{ ["--i" as string]: i }}
        >
          {ch}
        </span>
      ))}
    </p>
  )
}
