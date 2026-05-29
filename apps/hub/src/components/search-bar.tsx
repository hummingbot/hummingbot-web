"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CHIPS = ["market-making", "arbitrage", "binance", "grid", "perp", "directional"];

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function go(query: string) {
    const trimmed = query.trim();
    router.push(trimmed ? `/strategies?q=${encodeURIComponent(trimmed)}` : "/strategies");
  }

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        role="search"
      >
        <label htmlFor="hub-search" className="sr-only">
          Search the registry
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-500"
            aria-hidden="true"
          />
          <input
            id="hub-search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search strategies, routines, and agents…"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full rounded-xl border border-ink-700 bg-ink-950 pl-12 pr-4 text-base text-foreground placeholder:text-ink-600 focus-visible:border-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </form>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => go(c)}
            className="rounded-full border border-ink-800 bg-ink-900 px-3 py-1 text-xs text-ink-400 transition-colors hover:border-ink-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
