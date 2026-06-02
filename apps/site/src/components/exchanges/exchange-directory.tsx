"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { cn } from "@hummingbot/ui";
import {
  type Exchange,
  type MarketType,
  MARKET_TYPES,
  exchangeDocsUrl,
} from "@/lib/exchanges";

/** Colored dot per market type — neutral badge text keeps contrast safe in both themes. */
const TYPE_DOT: Record<MarketType, string> = {
  "CLOB Spot": "bg-brand-teal",
  "CLOB Perp": "bg-sky-400",
  "AMM DEX": "bg-fuchsia-400",
  "CLMM DEX": "bg-amber-400",
};

function TypeBadge({ type }: { type: MarketType }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-800 bg-ink-900/60 px-2 py-0.5 text-xs font-medium text-ink-300">
      <span className={cn("size-1.5 shrink-0 rounded-full", TYPE_DOT[type])} aria-hidden="true" />
      {type}
    </span>
  );
}

export function ExchangeDirectory({ exchanges }: { exchanges: Exchange[] }) {
  const [filter, setFilter] = useState<MarketType | "All">("All");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exchanges.filter(
      (e) =>
        (filter === "All" || e.types.includes(filter)) &&
        (!q || e.name.toLowerCase().includes(q)),
    );
  }, [exchanges, filter, query]);

  return (
    <div>
      {/* controls: type chips + search */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by market type">
          {(["All", ...MARKET_TYPES] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={filter === t}
              onClick={() => setFilter(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === t
                  ? "border-brand-teal bg-brand-teal text-ink-950"
                  : "border-ink-800 text-ink-400 hover:border-ink-700 hover:text-foreground",
              )}
            >
              {t !== "All" && (
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", TYPE_DOT[t as MarketType])}
                  aria-hidden="true"
                />
              )}
              {t}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exchanges…"
            aria-label="Search exchanges"
            className="w-full rounded-lg border border-ink-800 bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-ink-500 focus-visible:border-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <p className="mb-4 text-sm text-ink-500">
        {shown.length} {shown.length === 1 ? "exchange" : "exchanges"}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((e) => (
          <a
            key={e.slug}
            href={exchangeDocsUrl(e)}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-3 rounded-xl border border-ink-800 bg-card p-4 transition-colors hover:border-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{e.name}</span>
              <ArrowUpRight
                className="size-4 shrink-0 text-ink-600 transition-colors group-hover:text-brand-teal"
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {e.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>
          </a>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-800 py-12 text-center text-ink-500">
          No exchanges match your filter.
        </p>
      )}
    </div>
  );
}
