import { notFound } from "next/navigation";
import { HubFooter, HubHeader } from "@/components/hub-shell";
import { FilterSidebar } from "@/components/filter-sidebar";
import { PrimitiveCard } from "@/components/primitive-card";
import {
  allCategories,
  allExchanges,
  browse,
  type Sort,
} from "@/lib/registry";
import { PLURAL, toSingular } from "@/lib/types";

export function generateStaticParams() {
  return Object.values(PLURAL).map((type) => ({ type }));
}

const LABEL: Record<string, string> = {
  strategy: "Strategies",
  routine: "Routines",
  agent: "Agents",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<SP>;
}) {
  const { type: plural } = await params;
  const type = toSingular(plural);
  if (!type) notFound();

  const sp = await searchParams;
  const q = one(sp.q);
  const rows = browse({
    type,
    q,
    sort: (one(sp.sort) as Sort) || undefined,
    category: one(sp.category),
    exchanges: one(sp.exchanges)?.split(",").filter(Boolean),
    capabilities: one(sp.caps)?.split(",").filter(Boolean) as (
      | "hasVideo"
      | "hasSource"
      | "certified"
    )[],
  });

  return (
    <>
      <HubHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{LABEL[type]}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {rows.length} {rows.length === 1 ? "result" : "results"}
            {q ? ` for “${q}”` : ""}
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row">
          <FilterSidebar categories={allCategories()} exchanges={allExchanges()} />
          <div className="flex-1">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-800 p-12 text-center text-ink-500">
                No {plural} match your filters.
              </div>
            ) : (
              <div className="grid gap-4">
                {rows.map((p) => (
                  <PrimitiveCard key={`${p.namespace}/${p.name}`} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <HubFooter />
    </>
  );
}
