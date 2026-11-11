/**
 * Faint order-book depth chart behind the hero: cumulative bids (bull) step
 * up to the left of the mid price, asks (bear) to the right, over a quiet
 * price grid. Generated from a fixed seed, so the server renders it and
 * nothing shifts on hydration.
 */

const W = 1200;
const H = 400;
const MID = W / 2;
const LEVELS = 28;
const LEVEL_W = (MID - 40) / LEVELS;

/** mulberry32: small deterministic PRNG. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cumulative depth per level, outward from the mid price. */
function depth(rand: () => number): number[] {
  const sizes = Array.from({ length: LEVELS }, (_, i) => (0.4 + rand() * 1.2) * (1 + i / 10) * (rand() > 0.88 ? 2.6 : 1));
  const cumulative: number[] = [];
  sizes.reduce((sum, s, i) => (cumulative[i] = sum + s), 0);
  return cumulative;
}

/** Stepped area path; `dir` -1 walks left (bids), +1 right (asks). */
function stepPath(cum: number[], max: number, dir: -1 | 1): { area: string; line: string } {
  const y = (v: number) => H - 24 - (v / max) * (H - 96);
  let line = `M ${MID + dir * 6} ${H - 24}`;
  cum.forEach((v, i) => {
    const x0 = MID + dir * (6 + i * LEVEL_W);
    const x1 = MID + dir * (6 + (i + 1) * LEVEL_W);
    line += ` L ${x0.toFixed(1)} ${y(v).toFixed(1)} L ${x1.toFixed(1)} ${y(v).toFixed(1)}`;
  });
  const end = MID + dir * (6 + cum.length * LEVEL_W);
  return { line, area: `${line} L ${end.toFixed(1)} ${H - 24} Z` };
}

export function MarketDepthBackground({ seed = 7, opacity = 0.25 }: { seed?: number; opacity?: number }) {
  const rand = rng(seed);
  const bids = depth(rand);
  const asks = depth(rand);
  const max = Math.max(bids[bids.length - 1], asks[asks.length - 1]);
  const bid = stepPath(bids, max, -1);
  const ask = stepPath(asks, max, 1);

  return (
    <div className="pointer-events-none absolute inset-0 z-0" style={{ opacity }} aria-hidden="true">
      <svg className="h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        {/* price grid */}
        {Array.from({ length: 9 }, (_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            x2={W}
            y1={40 + i * 40}
            y2={40 + i * 40}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* mid price */}
        <line
          x1={MID}
          x2={MID}
          y1="24"
          y2={H - 24}
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeDasharray="4 6"
          vectorEffect="non-scaling-stroke"
        />
        <path d={bid.area} fill="var(--color-bull)" fillOpacity="0.18" />
        <path d={bid.line} fill="none" stroke="var(--color-bull)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d={ask.area} fill="var(--color-bear)" fillOpacity="0.18" />
        <path d={ask.line} fill="none" stroke="var(--color-bear)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
