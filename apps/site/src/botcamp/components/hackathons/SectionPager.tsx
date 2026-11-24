"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"

// The sticky header's height: a section lands just below it.
const HEADER_PX = 64
// How long an arrow stays lit after a press (click or key).
const PRESS_MS = 350

function panels(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-panel]")]
}

// The section the reader is in: the last one whose top has passed the header.
function currentIndex(list: HTMLElement[]): number {
  const line = HEADER_PX + 8
  let index = 0
  list.forEach((el, i) => {
    if (el.getBoundingClientRect().top <= line) index = i
  })
  return index
}

/**
 * Up and down arrows that move between the page's full-screen sections
 * (every element marked `data-panel`; globals.css sizes and snaps them),
 * from the buttons or the arrow and page keys.
 */
export function SectionPager() {
  const [at, setAt] = useState({ index: 0, count: 0, atTop: true, atBottom: false })

  useEffect(() => {
    const root = document.documentElement
    const update = () => {
      const list = panels()
      setAt({
        index: currentIndex(list),
        count: list.length,
        atTop: window.scrollY <= 0,
        atBottom: window.innerHeight + window.scrollY >= root.scrollHeight - 4,
      })
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  // The arrow last pressed, lit briefly so a key press shows on screen too.
  const [pressed, setPressed] = useState<1 | -1 | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(pressTimer.current), [])

  const go = useCallback((step: 1 | -1) => {
    setPressed(step)
    clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => setPressed(null), PRESS_MS)
    const list = panels()
    const from = currentIndex(list)
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    // Down always moves on, even from a section taller than the screen.
    // Partway down a section, "up" returns to its top first.
    const back = step === -1 && list[from].getBoundingClientRect().top < HEADER_PX - 8
    const target = list[back ? from : from + step]
    if (!target) return
    target.scrollIntoView({ behavior, block: "start" })
  }, [])

  // The arrow and page keys step between sections too, unless something
  // focused (a field, a slider, a tab list) uses them itself.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const step = event.key === "ArrowDown" || event.key === "PageDown" ? 1 : event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 0
      if (!step) return
      const el = document.activeElement as HTMLElement | null
      if (el?.closest("input, textarea, select, [contenteditable], [role=slider], [role=tablist], [role=listbox], [role=menu]")) return
      event.preventDefault()
      go(step)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go])

  if (at.count < 2) return null
  const canUp = !at.atTop
  const canDown = at.index < at.count - 1 && !at.atBottom
  const button =
    "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-lg backdrop-blur-md transition-[opacity,transform,background-color,border-color,color] duration-150 hover:border-primary hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-0"
  const lit = "scale-90 border-primary bg-primary text-primary-foreground hover:text-primary-foreground"

  return (
    <nav
      aria-label="Page sections"
      // Phones scroll by touch; the pager would only cover the content there.
      className="fixed right-4 z-40 hidden flex-col gap-2 md:right-6 md:flex"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <button type="button" onClick={() => go(-1)} disabled={!canUp} aria-label="Previous section" className={cn(button, pressed === -1 && lit)}>
        <ChevronUp className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => go(1)} disabled={!canDown} aria-label="Next section" className={cn(button, pressed === 1 && lit)}>
        <ChevronDown className="h-5 w-5" />
      </button>
    </nav>
  )
}
