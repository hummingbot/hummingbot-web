"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, ChevronLeft, ChevronRight, Play, Trophy } from "lucide-react"
import { WORDMARKS } from "@/botcamp/components/hackathons/SponsorLogos"
import { AvatarWithFallback } from "@/botcamp/components/ui/avatar-with-fallback"
import type { StrategyShowcase } from "@/botcamp/lib/strategy-showcase"
import { capitalizeExchange, cn } from "@/botcamp/lib/utils"
import { CandleBackdrop, RankNumeral, ordinal, plainSummary } from "./StrategyCover"

export interface CondorReadyAgent {
  id: number
  slug: string
  title: string
  summary: string | null
  tags: string[]
  exchanges: string[]
  videoURL: string | null
  /** Latest APPROVED version — the one Condor's Hub pulls. */
  version: number
  /** ISO date the admin approved that version. */
  approvedAt: string
  /** In the free-preview set: cloning it needs no membership. */
  free: boolean
  showcase: StrategyShowcase | null
  authors: { slug: string; name: string; avatarURL: string | null }[]
}

interface CondorReadyCarouselProps {
  agents: CondorReadyAgent[]
}

// The agent in front leads: square to you, nearest and biggest. The ones
// beside it step back and shrink, turned in toward it with their outer edge
// nearer you, so the strip still curves round you. Distances below are in
// card widths, by how many cards from the front a card is.
// The first neighbour tucks a little behind the front card (they stack, so
// the front one stays on top); each card after that tucks in closer still.
const FIRST_STEP = 0.72
const NEXT_STEP = 0.38
// How far back the first neighbour sits, and each card after it.
const FIRST_DEPTH = 0.55
const NEXT_DEPTH = 0.3
// How far the side cards turn in toward the front one.
const TURN = (38 * Math.PI) / 180
// The viewer's distance, in card widths.
const VIEW_DISTANCE = 2.5
// Cards further than this from the front fade out over the last card.
const VISIBLE_CARDS = 2.5
// How much the side cards are dimmed, so the front one leads.
const SIDE_DIM = 0.5
// How long the front card holds before the next one comes round on its own,
// how quickly the drawn position eases toward where it's headed, and how
// long a touchpad swipe has to go quiet before the strip settles on a card.
const AUTOPLAY_SECONDS = 4
const EASE = 0.08
const SETTLE_MS = 140
// A press that moves less than this (in pixels) is still a click on the card.
const DRAG_CLICK_TOLERANCE = 6

// The strip holds the front card (a 2.2:1 cover and a slim footer), the
// tallest thing on it. The rest of the first screen goes to the header, the
// title and the arrows.
const STRIP_HEIGHT_PER_WIDTH = 1 / 2.2
const FOOTER_HEIGHT = 90
// A little air above and below the cards. The strip clips only its sides
// (where the side cards run off the screen), so the winner's halo can spill
// past its top and bottom without being cut.
const STRIP_PADDING = 16
const SCREEN_RESERVED_HEIGHT = 280

// Over half the screen for the card in front, short enough that the page's
// title and the whole strip fit on the first screen. Phones get most of the
// width.
function cardWidth(stripWidth: number, screenHeight: number): number {
  const byWidth = stripWidth < 640 ? stripWidth * 0.86 : stripWidth * 0.56
  const byHeight =
    (screenHeight - SCREEN_RESERVED_HEIGHT - FOOTER_HEIGHT - STRIP_PADDING * 2) / STRIP_HEIGHT_PER_WIDTH
  return Math.round(Math.max(260, Math.min(880, byWidth, byHeight)))
}

// Where an agent sits relative to the middle, in cards, the short way round.
function ringOffset(index: number, position: number, size: number): number {
  let offset = (((index - position) % size) + size) % size
  if (offset > size / 2) offset -= size
  return offset
}

// An endless strip of the Condor Ready agents, the one in front leading, that
// moves on to the next one every few seconds. Hovering pauses it; a touchpad
// swipe, a drag, the arrow keys or the buttons move it. Positions are written
// straight to the DOM each frame, so the motion never re-renders React.
export function CondorReadyCarousel({ agents }: CondorReadyCarouselProps): React.JSX.Element {
  const size = agents.length
  const strip = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const [screen, setScreen] = useState({ width: 0, height: 0 })
  // Where the strip is drawn, and where it's headed, both in cards.
  const motion = useRef({ position: 0, target: 0, idle: 0, paused: false, dragging: false })
  const dragged = useRef(false)
  // The agent in front: only it opens on a click, the others come forward.
  const [front, setFront] = useState(0)
  const frontRef = useRef(0)

  // Card size follows the strip's width and the window's height.
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const measure = () => setScreen({ width: el.clientWidth, height: window.innerHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  const w = screen.width ? cardWidth(screen.width, screen.height) : 0
  // Wheel and drag pixels per card: about the gap between two cards on screen.
  const pitch = w * 0.75

  // The frame loop: advance the target when it's time, ease the position
  // toward it, and place
  // every card by its distance from the front.
  useEffect(() => {
    if (!w) return
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const m = motion.current
      const dt = Math.min(now - last, 64) / 1000
      last = now
      // Once the strip has come to rest on a card, count down to the next.
      const resting = Math.abs(m.target - m.position) < 0.01
      if (!m.paused && !m.dragging && !reducedMotion && resting) {
        m.idle += dt
        if (m.idle >= AUTOPLAY_SECONDS) {
          m.target = Math.round(m.target) + 1
          m.idle = 0
        }
      }
      m.position += (m.target - m.position) * (m.dragging ? 1 : EASE)

      const nowFront = ((Math.round(m.position) % size) + size) % size
      if (nowFront !== frontRef.current) {
        frontRef.current = nowFront
        setFront(nowFront)
      }

      cards.current.forEach((card, i) => {
        if (!card) return
        const offset = ringOffset(i, m.position, size)
        const side = Math.sign(offset)
        const distance = Math.abs(offset)
        // Leaves the front slowly and eases into the first neighbour's place,
        // where it meets the pace the cards further out keep: no kink, and
        // no two cards splayed open either side of the middle.
        const t = Math.min(distance, 1)
        const settle = t * t * (3 - 2 * t)
        const x = side * w * (NEXT_STEP * distance + (FIRST_STEP - NEXT_STEP) * settle)
        const z = -w * (NEXT_DEPTH * distance + (FIRST_DEPTH - NEXT_DEPTH) * settle)
        const opacity = Math.min(1, Math.max(0, VISIBLE_CARDS + 0.5 - distance))
        card.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${-side * TURN * settle}rad)`
        // Stacked by distance from the front, so the front card is always on
        // top and cards never cut through each other.
        card.style.zIndex = String(Math.round(100 - distance * 10))
        card.style.opacity = String(opacity)
        // Covers follow the theme here (Botcamp keeps them dark): brightness
        // dimming greys the side cards on a light page, so dim less there.
        const sideDim = document.documentElement.getAttribute("data-theme") === "light" ? 0.12 : SIDE_DIM
        card.style.filter = `brightness(${1 - sideDim * Math.min(distance / 1.5, 1)})`
        card.inert = opacity < 1
      })
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [w, size])

  // A sideways touchpad swipe (or horizontal wheel) slides the strip with the
  // fingers. Non-passive, so it can't also go back a page in history.
  useEffect(() => {
    const el = strip.current
    if (!el || !pitch) return
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      const dx = event.deltaMode === 1 ? event.deltaX * 16 : event.deltaX
      const m = motion.current
      m.target += dx / pitch
      m.idle = 0
      // When the swipe goes quiet, settle on the nearest card.
      clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        m.target = Math.round(m.target)
      }, SETTLE_MS)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("wheel", onWheel)
      clearTimeout(settleTimer)
    }
  }, [pitch])

  // Brings a side card round to the front, the short way.
  const bringToFront = (index: number) => {
    const m = motion.current
    m.target = Math.round(m.target + ringOffset(index, m.target, size))
  }

  // One card along, from wherever the strip is now.
  const step = (direction: 1 | -1) => {
    const m = motion.current
    m.target = Math.round(m.target) + direction
    m.idle = 0
  }

  const dragStart = useRef({ x: 0, target: 0 })
  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return
    dragStart.current = { x: event.clientX, target: motion.current.target }
    dragged.current = false
    motion.current.dragging = true
    // Captured on the first real move instead, so a plain click still
    // reaches the card's link.
  }
  const handlePointerMove = (event: React.PointerEvent) => {
    const m = motion.current
    if (!m.dragging) return
    const dx = event.clientX - dragStart.current.x
    if (!dragged.current && Math.abs(dx) > DRAG_CLICK_TOLERANCE) {
      dragged.current = true
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    }
    if (dragged.current) m.target = dragStart.current.target - dx / pitch
  }
  // A drag lets go onto the nearest card.
  const endDrag = () => {
    const m = motion.current
    if (!m.dragging) return
    m.dragging = false
    m.target = Math.round(m.target)
    m.idle = 0
  }

  return (
    <div>
      {/* Full-bleed, so the strip curves out to the edges of the screen. */}
      <div
        ref={strip}
        role="region"
        aria-roledescription="carousel"
        aria-label="Condor Ready agents"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1)
          if (event.key === "ArrowRight") step(1)
        }}
        onPointerEnter={() => (motion.current.paused = true)}
        onPointerLeave={() => {
          motion.current.paused = false
          endDrag()
        }}
        onFocus={() => (motion.current.paused = true)}
        onBlur={() => (motion.current.paused = false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          if (!dragged.current) return
          dragged.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        className="relative left-1/2 w-screen -translate-x-1/2 touch-pan-y select-none overflow-x-clip overscroll-x-contain outline-hidden"
        style={{ height: w ? w * STRIP_HEIGHT_PER_WIDTH + FOOTER_HEIGHT + STRIP_PADDING * 2 : 360, perspective: w ? w * VIEW_DISTANCE : 1000 }}
      >
        {/* A soft light behind the top of the front card. It fades out before
            either edge of the strip, so the strip's edges never cut it off. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_30%,rgb(var(--condor-gold-rgb)/0.12),transparent)]"
        />
        {/* The cards share the strip's perspective but not a 3D space: each is
            flattened on its own and they stack by z-index, so turning cards
            never slice through one another. */}
        {w > 0 &&
          agents.map((agent, i) => (
            <div
              key={agent.id}
              ref={(el) => {
                cards.current[i] = el
              }}
              className="absolute left-1/2 top-1/2 transition-opacity duration-300 will-change-transform [backface-visibility:hidden]"
              style={{ width: w }}
            >
              <AgentCard
                agent={agent}
                active={i === front}
                onBringToFront={() => bringToFront(i)}
              />
            </div>
          ))}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <CarouselButton label="Previous agent" onClick={() => step(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </CarouselButton>
        <CarouselButton label="Next agent" onClick={() => step(1)}>
          <ChevronRight className="h-4 w-4" />
        </CarouselButton>
      </div>
    </div>
  )
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-bc-md border border-border bg-card text-foreground transition-colors hover:border-condor-gold/60 hover:text-condor-gold"
    >
      {children}
    </button>
  )
}

function AgentCard({
  agent,
  active,
  onBringToFront,
}: {
  agent: CondorReadyAgent
  /** In front of the carousel: full size, and a click opens the agent. */
  active: boolean
  onBringToFront: () => void
}): React.JSX.Element {
  const author = agent.authors[0]
  const { showcase } = agent
  const isWinner = showcase?.rank === 1

  const card = (
    <Link
      href={`/hub/${agent.slug}`}
      // A side card comes to the front first; only the front one opens.
      onClick={(event) => {
        if (active) return
        event.preventDefault()
        onBringToFront()
      }}
      tabIndex={active ? 0 : -1}
      aria-hidden={!active}
      draggable={false}
      className={cn(
        // Botcamp scopes `dark` to the card (its cover is always dark); here
        // the card and its cover follow the site theme.
        "hub-card group relative flex h-full w-full flex-col overflow-hidden rounded-bc-xl bg-card text-foreground transition-[border-color,box-shadow] duration-500",
        // The winner's border is the frame drawn around it below.
        !isWinner && "border",
        !isWinner && (active ? "border-condor-gold/40" : "border-border"),
      )}
    >
      <AgentCover agent={agent} />

      {/* A slim footer, so the cover does the presenting. */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
        {author ? (
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <AvatarWithFallback name={author.name} src={author.avatarURL} size="xs" />
            <span className="truncate text-muted-foreground">
              {author.name}
              {agent.authors.length > 1 && ` +${agent.authors.length - 1}`}
            </span>
          </span>
        ) : (
          <span />
        )}
        <span className="flex shrink-0 items-center gap-4">
          {/* The version Condor's Hub pulls, and who can clone it. */}
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
            v{agent.version} · {agent.free ? "Free to clone" : "Members"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-colors group-hover:text-condor-gold-deep dark:group-hover:text-condor-gold">
            View Agent
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </div>
    </Link>
  )

  if (!isWinner) return card

  // The race winner: a soft gold halo around it, and a light that runs slowly
  // round its border once every few seconds — enough to catch the eye, not
  // enough to pull it away.
  const borderLight =
    "absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,rgb(var(--condor-gold-rgb))_40deg,rgb(255_255_255/0.9)_55deg,rgb(var(--condor-gold-rgb))_70deg,transparent_110deg)] motion-safe:animate-[spin_6s_linear_infinite]"
  // The halo is a shadow, so it follows the card's rounded corners: wide and
  // faint, reaching about 66px out.
  return (
    <div className="relative h-full w-full overflow-hidden rounded-bc-xl p-px shadow-[0_0_60px_6px_rgb(var(--condor-gold-rgb)/0.22)]">
      <div aria-hidden className="absolute inset-0 bg-condor-gold/50" />
      <div aria-hidden className={borderLight} />
      <div className="relative h-full w-full overflow-hidden rounded-[11px]">{card}</div>
    </div>
  )
}


// Every agent's cover is drawn the same way, so the carousel reads as one
// set: the seeded chart, the race finish in outline, the name set large and
// the venues' wordmarks.
function AgentCover({ agent }: { agent: CondorReadyAgent }): React.JSX.Element {
  const summary = plainSummary(agent.summary)
  const { showcase } = agent

  return (
    <div className="relative aspect-[2.2/1] overflow-hidden border-b border-border bg-[var(--cover-ink)] strategy-cover">
      <CandleBackdrop seed={agent.slug} className="opacity-40 transition-opacity duration-500 group-hover:opacity-60" />
      {/* Darkens the bottom-left, under the name. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,var(--cover-ink)_25%,transparent_70%)]"
      />

      {showcase && (
        <RankNumeral rank={showcase.rank} className="absolute right-5 top-4 sm:right-6 sm:top-5" />
      )}

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-center gap-2">
          {showcase?.rank === 1 ? (
            <span className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-condor-gold px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-condor-ink">
              {/* Same light sweep as the hackathon podium. */}
              <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 w-1/3 -translate-x-[150%] motion-safe:animate-podium-sheen"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)" }}
                />
              </span>
              <Trophy className="relative h-3 w-3" />
              <span className="relative">Winner · {showcase.hackathon.title}</span>
            </span>
          ) : showcase ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-condor-gold/40 bg-[var(--cover-ink)]/50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-condor-gold-deep dark:text-condor-gold backdrop-blur-xs">
              <Trophy className="h-3 w-3" />
              {ordinal(showcase.rank)} · {showcase.hackathon.title}
            </span>
          ) : (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--cover-fg)/0.5)]">
              Condor Ready
            </span>
          )}
          {agent.videoURL && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--cover-fg)/0.1)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--cover-fg)/0.7)]">
              <Play className="h-2.5 w-2.5 fill-current" />
              Demo
            </span>
          )}
        </div>

        <div className="max-w-[80%]">
          <h3 className="line-clamp-2 text-2xl font-bold leading-[1.05] tracking-[-0.03em] text-[hsl(var(--cover-fg))] sm:text-4xl sm:leading-(--text-4xl--line-height)">
            {agent.title}
          </h3>
          {summary && (
            <p className="mt-2 line-clamp-2 max-w-xl text-xs leading-relaxed text-[hsl(var(--cover-fg)/0.65)] sm:text-sm sm:leading-(--text-sm--line-height)">
              {summary}
            </p>
          )}
          {agent.exchanges.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {agent.exchanges.map((exchange) => {
                // The cover follows the theme, so its wordmark does too.
                const logo = WORDMARKS[exchange.toLowerCase()]
                return logo ? (
                  <Fragment key={exchange}>
                    <Image
                      src={logo.light}
                      alt={capitalizeExchange(exchange)}
                      draggable={false}
                      className="h-4 w-auto opacity-80 sm:h-5 dark:hidden"
                    />
                    <Image
                      src={logo.dark}
                      alt={capitalizeExchange(exchange)}
                      draggable={false}
                      className="hidden h-4 w-auto opacity-80 sm:h-5 dark:block"
                    />
                  </Fragment>
                ) : (
                  <span key={exchange} className="font-mono text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--cover-fg)/0.7)]">
                    {capitalizeExchange(exchange)}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

