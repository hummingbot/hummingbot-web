"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { cn } from "@hummingbot/ui";
import type { HubLibraryItem } from "@/lib/hub";
import {
  CandleBackdrop,
  Initials,
  RankNumeral,
  ordinal,
  plainSummary,
} from "./strategy-cover";

// Ported from Botcamp's /strategies carousel. The agent in front leads,
// square to you; the ones beside it step back and turn in toward it. Distances
// are in card widths, by how many cards from the front a card is.
const FIRST_STEP = 0.72;
const NEXT_STEP = 0.38;
const FIRST_DEPTH = 0.55;
const NEXT_DEPTH = 0.3;
const TURN = (38 * Math.PI) / 180;
const VIEW_DISTANCE = 2.5;
const VISIBLE_CARDS = 2.5;
const SIDE_DIM = 0.5;
const AUTOPLAY_SECONDS = 4;
const EASE = 0.08;
const SETTLE_MS = 140;
const DRAG_CLICK_TOLERANCE = 6;
const STRIP_HEIGHT_PER_WIDTH = 1 / 2.2;
const FOOTER_HEIGHT = 90;
const STRIP_PADDING = 16;
const SCREEN_RESERVED_HEIGHT = 280;

function cardWidth(stripWidth: number, screenHeight: number): number {
  const byWidth = stripWidth < 640 ? stripWidth * 0.86 : stripWidth * 0.56;
  const byHeight =
    (screenHeight -
      SCREEN_RESERVED_HEIGHT -
      FOOTER_HEIGHT -
      STRIP_PADDING * 2) /
    STRIP_HEIGHT_PER_WIDTH;
  return Math.round(Math.max(260, Math.min(880, byWidth, byHeight)));
}

// Where an agent sits relative to the middle, in cards, the short way round.
function ringOffset(index: number, position: number, size: number): number {
  let offset = (((index - position) % size) + size) % size;
  if (offset > size / 2) offset -= size;
  return offset;
}

/**
 * An endless strip of Condor Ready agents that moves on every few seconds.
 * Hovering pauses it; a swipe, a drag, the arrow keys or the buttons move it.
 * Positions are written straight to the DOM each frame, so motion never
 * re-renders React.
 */
export function CondorReadyCarousel({ agents }: { agents: HubLibraryItem[] }) {
  const size = agents.length;
  const strip = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [screen, setScreen] = useState({ width: 0, height: 0 });
  const motion = useRef({
    position: 0,
    target: 0,
    idle: 0,
    paused: false,
    dragging: false,
  });
  const dragged = useRef(false);
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () =>
      setScreen({ width: el.clientWidth, height: window.innerHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const w = screen.width ? cardWidth(screen.width, screen.height) : 0;
  const pitch = w * 0.75;

  useEffect(() => {
    if (!w) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Dimming by brightness greys the side cards on a light page; dim less there.
    const sideDim = () =>
      document.documentElement.getAttribute("data-theme") === "light" ? 0.12 : SIDE_DIM;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const m = motion.current;
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const resting = Math.abs(m.target - m.position) < 0.01;
      if (!m.paused && !m.dragging && !reducedMotion && resting) {
        m.idle += dt;
        if (m.idle >= AUTOPLAY_SECONDS) {
          m.target = Math.round(m.target) + 1;
          m.idle = 0;
        }
      }
      m.position += (m.target - m.position) * (m.dragging ? 1 : EASE);

      const nowFront = ((Math.round(m.position) % size) + size) % size;
      if (nowFront !== frontRef.current) {
        frontRef.current = nowFront;
        setFront(nowFront);
      }

      cards.current.forEach((card, i) => {
        if (!card) return;
        const offset = ringOffset(i, m.position, size);
        const side = Math.sign(offset);
        const distance = Math.abs(offset);
        const t = Math.min(distance, 1);
        const settle = t * t * (3 - 2 * t);
        const x =
          side * w * (NEXT_STEP * distance + (FIRST_STEP - NEXT_STEP) * settle);
        const z =
          -w * (NEXT_DEPTH * distance + (FIRST_DEPTH - NEXT_DEPTH) * settle);
        const opacity = Math.min(
          1,
          Math.max(0, VISIBLE_CARDS + 0.5 - distance),
        );
        card.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${-side * TURN * settle}rad)`;
        card.style.zIndex = String(Math.round(100 - distance * 10));
        card.style.opacity = String(opacity);
        card.style.filter = `brightness(${1 - sideDim() * Math.min(distance / 1.5, 1)})`;
        card.inert = opacity < 1;
      });
      frame = requestAnimationFrame(tick);
    };

    // Place the cards right away, so the strip never shows empty while it
    // waits for the first frame (or where frames don't run, e.g. headless).
    tick(last);
    return () => cancelAnimationFrame(frame);
  }, [w, size]);

  // A sideways touchpad swipe slides the strip; non-passive so it can't also
  // go back a page in history.
  useEffect(() => {
    const el = strip.current;
    if (!el || !pitch) return;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const dx = event.deltaMode === 1 ? event.deltaX * 16 : event.deltaX;
      const m = motion.current;
      m.target += dx / pitch;
      m.idle = 0;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        m.target = Math.round(m.target);
      }, SETTLE_MS);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(settleTimer);
    };
  }, [pitch]);

  const bringToFront = (index: number) => {
    const m = motion.current;
    m.target = Math.round(m.target + ringOffset(index, m.target, size));
  };

  const step = (direction: 1 | -1) => {
    const m = motion.current;
    m.target = Math.round(m.target) + direction;
    m.idle = 0;
  };

  const dragStart = useRef({ x: 0, target: 0 });
  const handlePointerDown = (event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    dragStart.current = { x: event.clientX, target: motion.current.target };
    dragged.current = false;
    motion.current.dragging = true;
  };
  const handlePointerMove = (event: ReactPointerEvent) => {
    const m = motion.current;
    if (!m.dragging) return;
    const dx = event.clientX - dragStart.current.x;
    if (!dragged.current && Math.abs(dx) > DRAG_CLICK_TOLERANCE) {
      dragged.current = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    if (dragged.current) m.target = dragStart.current.target - dx / pitch;
  };
  const endDrag = () => {
    const m = motion.current;
    if (!m.dragging) return;
    m.dragging = false;
    m.target = Math.round(m.target);
    m.idle = 0;
  };

  return (
    <div>
      <div
        ref={strip}
        role="region"
        aria-roledescription="carousel"
        aria-label="Condor Ready agents"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1);
          if (event.key === "ArrowRight") step(1);
        }}
        onPointerEnter={() => (motion.current.paused = true)}
        onPointerLeave={() => {
          motion.current.paused = false;
          endDrag();
        }}
        onFocus={() => (motion.current.paused = true)}
        onBlur={() => (motion.current.paused = false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          if (!dragged.current) return;
          dragged.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        className="relative left-1/2 w-screen -translate-x-1/2 touch-pan-y select-none overflow-x-clip overscroll-x-contain outline-none"
        style={{
          height: w
            ? w * STRIP_HEIGHT_PER_WIDTH + FOOTER_HEIGHT + STRIP_PADDING * 2
            : 360,
          perspective: w ? w * VIEW_DISTANCE : 1000,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_30%,hsl(var(--primary)/0.12),transparent)]"
        />
        {w > 0 &&
          agents.map((agent, i) => (
            <div
              key={agent.slug}
              ref={(el) => {
                cards.current[i] = el;
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
          <ChevronLeft className="size-4" />
        </CarouselButton>
        <CarouselButton label="Next agent" onClick={() => step(1)}>
          <ChevronRight className="size-4" />
        </CarouselButton>
      </div>
    </div>
  );
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:border-primary/60 hover:text-primary"
    >
      {children}
    </button>
  );
}

function AgentCard({
  agent,
  active,
  onBringToFront,
}: {
  agent: HubLibraryItem;
  active: boolean;
  onBringToFront: () => void;
}) {
  const isWinner = agent.showcase?.rank === 1;

  const card = (
    <Link
      href={`/hub/${agent.slug}`}
      onClick={(event) => {
        if (active) return;
        event.preventDefault();
        onBringToFront();
      }}
      tabIndex={active ? 0 : -1}
      aria-hidden={!active}
      draggable={false}
      className={cn(
        "hub-card group relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-card text-foreground transition-[border-color,box-shadow] duration-500",
        !isWinner && "border",
        !isWinner && (active ? "border-primary/40" : "border-border"),
      )}
    >
      <AgentCover agent={agent} />
      <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <Initials name={agent.author.name} />
          <span className="truncate text-muted-foreground">
            {agent.author.name}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-4">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
            v{agent.version} · {agent.free ? "Free to clone" : "Members"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            View Agent
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </div>
    </Link>
  );

  if (!isWinner) return card;

  // The race winner: a soft gold halo and a light running slowly round its border.
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl p-px shadow-[0_0_60px_6px_hsl(var(--primary)/0.22)]">
      <div aria-hidden="true" className="absolute inset-0 bg-primary/50" />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,hsl(var(--primary))_40deg,rgb(255_255_255/0.9)_55deg,hsl(var(--primary))_70deg,transparent_110deg)] motion-safe:animate-[spin_6s_linear_infinite]"
      />
      <div className="relative h-full w-full overflow-hidden rounded-[11px]">
        {card}
      </div>
    </div>
  );
}

function AgentCover({ agent }: { agent: HubLibraryItem }) {
  const summary = plainSummary(agent.description);
  const { showcase } = agent;

  return (
    <div className="relative aspect-[2.2/1] overflow-hidden border-b border-border bg-[var(--cover-ink)] strategy-cover">
      <CandleBackdrop
        seed={agent.slug}
        className="opacity-40 transition-opacity duration-500 group-hover:opacity-60 [[data-theme=light]_&]:opacity-55"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,var(--cover-ink)_25%,transparent_70%)]"
      />

      {showcase && (
        <RankNumeral
          rank={showcase.rank}
          className="absolute right-5 top-4 sm:right-6 sm:top-5"
        />
      )}

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-center gap-2">
          {showcase?.rank === 1 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              <Trophy className="size-3" />
              Winner · {showcase.hackathon}
            </span>
          ) : showcase ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/60 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur-sm">
              <Trophy className="size-3" />
              {ordinal(showcase.rank)} · {showcase.hackathon}
            </span>
          ) : (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--cover-fg)/0.50)]">
              Condor Ready
            </span>
          )}
        </div>

        <div className="max-w-[80%]">
          <h3 className="line-clamp-2 text-2xl font-bold leading-[1.05] tracking-[-0.03em] text-[hsl(var(--cover-fg))] sm:text-4xl">
            {agent.name}
          </h3>
          {summary && (
            <p className="mt-2 line-clamp-2 max-w-xl text-xs leading-relaxed text-[hsl(var(--cover-fg)/0.65)] sm:text-sm">
              {summary}
            </p>
          )}
          {agent.exchanges.length > 0 && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--cover-fg)/0.70)]">
              {agent.exchanges.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
