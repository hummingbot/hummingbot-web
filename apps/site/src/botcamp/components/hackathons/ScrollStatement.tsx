"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/botcamp/lib/utils"

interface ScrollStatementProps {
  lines: string[]
  // Index of the line drawn in the accent color (e.g. the punchline).
  accentLine?: number
  // Type size; defaults to the full interstitial size.
  sizeClassName?: string
}

// Light sweep (`.sd-sheen-text`), same idea as the buttons' bh-sheen: one
// band crossing all three lines at once, in ONE light color on every line (a
// per-line color switch read as separate effects, not a single shine): light
// gold shows as a golden glint on white and a brighter flash on the gold
// accent line. It's applied per word, not per line — each
// .sd-word animates its own opacity, which puts it on its own layer, and a
// line-level background-clip: text can't paint into those (the words would
// vanish) — but each word paints its slice of one line-wide gradient,
// aligned by the offsets measured below, so the band reads as one sweep.
const SHEEN_HIGHLIGHT = "#ffe27a"
const sheenStyle = (accent: boolean) =>
  ({
    "--sheen-base": accent ? "hsl(var(--primary))" : "hsl(var(--foreground))",
    "--sheen-hi": SHEEN_HIGHLIGHT,
  }) as React.CSSProperties
// One 1.4s pass + two 2s passes (`sd-sheen` in globals.css).
const SHEEN_BURST_MS = 1400 + 2 * 2000
// Word cascade timing (`.sd-word` transition in globals.css).
const WORD_CASCADE_MS = 70
const WORD_FADE_MS = 450

/**
 * A big interstitial line that, on scrolling into view, lights up word by
 * word and then flashes a light sweep across all its lines. Set in Satoshi,
 * like every headline. Styles live in globals.css (`.sd-word`,
 * `.sd-sheen-text`). Without JS, or with reduced motion, it renders fully lit.
 */
export function ScrollStatement({
  lines,
  accentLine,
  sizeClassName = "text-[clamp(1.75rem,5.5vw,5.5rem)]",
}: ScrollStatementProps) {
  const wordCount = lines.reduce((n, line) => n + line.split(" ").length, 0)
  let index = 0

  // When the line comes into view (half of it on screen), its words light up
  // in a quick cascade and then the sweep plays a burst of three passes.
  // Re-entering the view or hovering replays the sweep. Clearing the flag
  // between bursts lets the CSS animation restart from the top.
  const ref = useRef<HTMLParagraphElement>(null)
  const [reveal, setReveal] = useState<"pending" | "on" | undefined>(undefined)
  const [sheenOn, setSheenOn] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const playBurst = (afterMs = 0) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSheenOn(false)
    timerRef.current = setTimeout(() => {
      // Next frame: re-adding the flag restarts the animation.
      requestAnimationFrame(() => {
        setSheenOn(true)
        timerRef.current = setTimeout(() => setSheenOn(false), SHEEN_BURST_MS)
      })
    }, afterMs)
  }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // Dim the words only if the line starts off-screen, so nothing that's
    // already visible ever flashes dark.
    const box = el.getBoundingClientRect()
    let revealed = reduceMotion || (box.top < window.innerHeight && box.bottom > 0)
    if (!revealed) setReveal("pending")

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        if (!revealed) {
          revealed = true
          setReveal("on")
          playBurst(wordCount * WORD_CASCADE_MS + WORD_FADE_MS)
        } else {
          playBurst()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)

    // Per visual row: the text's width and each word's offset within it. The
    // sweep spans each row's own text, so every row starts together at its
    // first letter and finishes together at its last, however wide each is.
    // Rows, not lines: on a narrow screen one line wraps onto several rows.
    const measure = () => {
      const rows = new Map<number, HTMLElement[]>()
      el.querySelectorAll<HTMLElement>(".sd-word").forEach((word) => {
        const row = rows.get(word.offsetTop) ?? []
        row.push(word)
        rows.set(word.offsetTop, row)
      })
      rows.forEach((words) => {
        const left = words[0].getBoundingClientRect().left
        const width = words[words.length - 1].getBoundingClientRect().right - left
        words.forEach((word) => {
          word.style.setProperty("--sheen-p", `${width}px`)
          word.style.setProperty("--sheen-l", `${word.getBoundingClientRect().left - left}px`)
        })
      })
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(el)

    return () => {
      observer.disconnect()
      resize.disconnect()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // playBurst only touches refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <p
      ref={ref}
      data-reveal={reveal}
      data-sheen={sheenOn ? "on" : undefined}
      onMouseEnter={() => playBurst()}
      className={cn(sizeClassName, "sd-statement text-center font-bold uppercase tracking-[-0.03em] leading-[1.02]")}
    >
      {lines.map((line, lineIndex) => (
        <span
          key={lineIndex}
          className="block"
          style={
            lineIndex === accentLine
              ? { filter: "drop-shadow(0 0 28px hsl(var(--primary) / 0.35))" }
              : undefined
          }
        >
          {line.split(" ").map((word, wordIndex) => {
            const i = index++
            return (
              <span
                key={wordIndex}
                className="sd-word inline-block mr-[0.25em] last:mr-0"
                style={{ ["--sd-i" as string]: i }}
              >
                <span className="sd-sheen-text" style={sheenStyle(lineIndex === accentLine)}>
                  {word}
                </span>
              </span>
            )
          })}
        </span>
      ))}
    </p>
  )
}
