"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@hummingbot/ui";

const SORTS = [
  ["featured", "Featured"],
  ["installs", "Most installed"],
  ["stars", "Most starred"],
  ["updated", "Recently updated"],
  ["newest", "Newest"],
  ["name", "Name"],
] as const;

const CAPS = [
  ["hasVideo", "Has video"],
  ["hasSource", "Has source"],
  ["certified", "Certified"],
] as const;

export function FilterSidebar({
  categories,
  exchanges,
}: {
  categories: string[];
  exchanges: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const cur = new Set((params.get(key) ?? "").split(",").filter(Boolean));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      setParam(key, [...cur].join(","));
    },
    [params, setParam],
  );

  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "featured";
  const category = params.get("category") ?? "All";
  const selectedExchanges = new Set((params.get("exchanges") ?? "").split(",").filter(Boolean));
  const selectedCaps = new Set((params.get("caps") ?? "").split(",").filter(Boolean));

  return (
    <aside className="flex w-full flex-col gap-6 lg:sticky lg:top-20 lg:w-64 lg:shrink-0 lg:self-start">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
        <label htmlFor="filter-q" className="sr-only">Search</label>
        <input
          id="filter-q"
          defaultValue={q}
          onChange={(e) => setParam("q", e.target.value || null)}
          placeholder="Search…"
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-full rounded-md border border-ink-700 bg-ink-950 pl-9 pr-3 text-sm focus-visible:border-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="filter-sort" className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-500">Sort</label>
        <select
          id="filter-sort"
          value={sort}
          onChange={(e) => setParam("sort", e.target.value === "featured" ? null : e.target.value)}
          className="h-9 w-full rounded-md border border-ink-700 bg-ink-950 px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <FilterGroup label="Category">
        {["All", ...categories].map((c) => (
          <Chip key={c} active={category === c} onClick={() => setParam("category", c === "All" ? null : c)}>
            {c}
          </Chip>
        ))}
      </FilterGroup>

      {exchanges.length > 0 && (
        <FilterGroup label="Exchanges">
          {exchanges.map((e) => (
            <Chip key={e} active={selectedExchanges.has(e)} onClick={() => toggleInList("exchanges", e)}>
              {e}
            </Chip>
          ))}
        </FilterGroup>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-500">Capabilities</p>
        <div className="flex flex-col gap-2">
          {CAPS.map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-ink-300">
              <input
                type="checkbox"
                checked={selectedCaps.has(v)}
                onChange={() => toggleInList("caps", v)}
                className="size-4 rounded border-ink-700 bg-ink-950 accent-brand-teal"
              />
              {l}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-brand-teal/40 bg-brand-teal/10 text-brand-teal"
          : "border-ink-800 bg-ink-900 text-ink-400 hover:border-ink-700 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
