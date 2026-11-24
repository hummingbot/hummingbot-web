"use client";

import { useMemo } from "react";
import { cn } from "@hummingbot/ui";

// Shared pieces of the generated strategy covers in the Hub: the carousel's
// agent covers and the library's cards draw from the same set (ported from
// Botcamp's /strategies).

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// Summaries are markdown; the covers and cards show them as plain text.
export function plainSummary(summary: string | null | undefined): string {
  return (summary ?? "")
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// A small seeded generator, so each strategy always gets the same chart.
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

const CHART = { width: 360, height: 160 };

// A made-up candlestick chart seeded by the slug: decoration that tells the
// strategies apart, not market data.
function candles(seed: string, count: number) {
  const random = seededRandom(seed);
  const drift = (random() - 0.4) * 0.6;
  let price = 0;
  const raw = Array.from({ length: count }, () => {
    const open = price;
    const close = open + drift + (random() - 0.5) * 4;
    const high = Math.max(open, close) + random() * 1.5;
    const low = Math.min(open, close) - random() * 1.5;
    price = close;
    return { open, close, high, low };
  });
  const max = Math.max(...raw.map((c) => c.high));
  const min = Math.min(...raw.map((c) => c.low));
  const y = (v: number) =>
    12 + ((max - v) / (max - min || 1)) * (CHART.height - 24);
  const slot = CHART.width / count;
  return raw.map((c, i) => ({
    x: i * slot + slot / 2,
    width: slot * 0.5,
    top: y(Math.max(c.open, c.close)),
    bottom: y(Math.min(c.open, c.close)),
    high: y(c.high),
    low: y(c.low),
    up: c.close >= c.open,
  }));
}

const ACCENTS = {
  // The site's gold: agents Condor can clone.
  gold: "hsl(var(--cover-accent))",
  neutral: "rgb(255 255 255 / 0.55)",
};

/** The seeded candles, filling their (positioned) parent. */
export function CandleBackdrop({
  seed,
  accent = "gold",
  count = 36,
  className,
}: {
  seed: string;
  accent?: keyof typeof ACCENTS;
  count?: number;
  className?: string;
}) {
  // Three paths for the whole chart rather than two elements per candle.
  const paths = useMemo(() => {
    let wicks = "";
    let up = "";
    let down = "";
    for (const c of candles(seed, count)) {
      wicks += `M${c.x} ${c.high}V${c.low}`;
      const body = `M${c.x - c.width / 2} ${c.top}h${c.width}v${Math.max(c.bottom - c.top, 1)}h${-c.width}Z`;
      if (c.up) up += body;
      else down += body;
    }
    return { wicks, up, down };
  }, [seed, count]);
  const color = ACCENTS[accent];
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      preserveAspectRatio="none"
      className={cn(
        "absolute inset-0 h-full w-full [mask-image:linear-gradient(to_right,transparent_5%,black_70%)]",
        className,
      )}
    >
      <g stroke={color} strokeWidth={1}>
        <path d={paths.wicks} fill="none" vectorEffect="non-scaling-stroke" />
        <path d={paths.up} fill={color} vectorEffect="non-scaling-stroke" />
        <path
          d={paths.down}
          fill="var(--cover-ink)"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}

/** A race finish set large in outline, its suffix small beside it. */
export function RankNumeral({
  rank,
  size = "lg",
  className,
}: {
  rank: number;
  size?: "lg" | "sm";
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn("flex items-start", className)}>
      <span
        className={cn(
          "font-bold leading-[0.8] tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_hsl(var(--cover-accent))]",
          size === "lg" ? "text-[5.5rem] sm:text-[7.5rem]" : "text-6xl",
        )}
      >
        {rank}
      </span>
      <span
        className={cn(
          "ml-1 font-mono font-semibold uppercase text-primary",
          size === "lg" ? "text-sm sm:text-base" : "text-xs",
        )}
      >
        {ordinal(rank).replace(/^\d+/, "")}
      </span>
    </span>
  );
}

/** Initials in a tinted circle, for authors without a picture. */
export function Initials({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}
