"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, BadgeCheck, ChevronDown, Search } from "lucide-react";
import type { HubLibraryItem } from "@/lib/hub";
import { LibraryCard } from "./library-card";

type SortKey = "featured" | "newest" | "name";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
];

const control =
  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring";

/** The library under the carousel: Botcamp's toolbar (venue, sort, search) over the card grid. */
export function HubLibrary({ items }: { items: HubLibraryItem[] }) {
  const [query, setQuery] = useState("");
  const [venue, setVenue] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");

  const venues = useMemo(
    () => [...new Set(items.flatMap((i) => i.exchanges))].sort(),
    [items],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = items.filter(
      (i) =>
        (!venue || i.exchanges.includes(venue)) &&
        (!q ||
          [i.name, i.description, i.author.name, i.slug].some((f) =>
            f.toLowerCase().includes(q),
          )),
    );
    if (sort === "newest")
      out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [items, query, venue, sort]);

  return (
    <div>
      {/* The one status cut: Condor Ready, as on Botcamp. */}
      <div className="inline-flex rounded-lg border border-border p-1">
        <span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-base font-medium text-primary">
          <BadgeCheck className="size-4" aria-hidden="true" />
          Condor Ready
          <span className="font-mono text-xs">{items.length}</span>
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-border pb-5">
        <label className="relative">
          <span className="sr-only">Exchange</span>
          <select
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className={`${control} appearance-none pr-9`}
          >
            <option value="">All exchanges</option>
            {venues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </label>
        <label className="relative">
          <span className="sr-only">Sort</span>
          <ArrowUpDown
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={`${control} appearance-none pl-9 pr-9`}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </label>
        <label className="relative ml-auto w-full sm:w-72">
          <span className="sr-only">Search strategies</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search strategies, authors…"
            className={`${control} w-full pl-9 placeholder:text-muted-foreground`}
          />
        </label>
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        <span className="text-foreground">{shown.length}</span>{" "}
        {shown.length === 1 ? "strategy" : "strategies"}
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No strategies match. Try another search or exchange.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item, i) => (
            <LibraryCard
              key={item.slug}
              item={item}
              animationDelay={Math.min(i, 8) * 40}
            />
          ))}
        </div>
      )}
    </div>
  );
}
