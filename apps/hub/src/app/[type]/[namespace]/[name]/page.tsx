import { ArrowUpRight, Check, Star, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, CodeBlock } from "@hummingbot/ui";
import { HubFooter, HubHeader } from "@/components/hub-shell";
import { PrimitiveCard } from "@/components/primitive-card";
import {
  browse,
  getPrimitive,
  installCommand,
  primitivesByPublisher,
  slugOf,
} from "@/lib/registry";
import data from "@/content/registry.json";
import { fmtDate, fmtNum, PLURAL, toSingular } from "@/lib/types";

export function generateStaticParams() {
  return (data.primitives as { type: keyof typeof PLURAL; namespace: string; name: string }[]).map(
    (p) => ({ type: PLURAL[p.type], namespace: p.namespace, name: p.name }),
  );
}

export default async function DetailPage({
  params,
}: {
  params: Promise<{ type: string; namespace: string; name: string }>;
}) {
  const { type: plural, namespace, name } = await params;
  const type = toSingular(plural);
  if (!type) notFound();
  const p = getPrimitive(type, namespace, name);
  if (!p) notFound();

  const related = browse({ type })
    .filter((r) => r.name !== p.name && r.categories.some((c) => p.categories.includes(c)))
    .slice(0, 4);
  const more = primitivesByPublisher(p.namespace).filter((r) => r.name !== p.name).length;

  return (
    <>
      <HubHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-semibold sm:text-3xl" translate="no">
                {slugOf(p)}
              </h1>
              <Badge variant="default">v{p.latest}</Badge>
              {p.certified && <Badge variant="brand">Certified</Badge>}
            </div>
            <p className="mt-2 max-w-2xl text-pretty text-ink-300">{p.summary}</p>
          </div>
        </div>

        <div className="mt-5 max-w-2xl">
          <CodeBlock command={installCommand(p)} />
        </div>

        {/* Stat row */}
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {p.installs != null && <Stat label="Installs" value={fmtNum(p.installs)} />}
          {p.stars != null && (
            <Stat
              label="Stars"
              value={
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-current" aria-hidden="true" />
                  {p.stars}
                </span>
              }
            />
          )}
          <Stat label="Versions" value={String(p.versions.length)} />
          <Stat label="Updated" value={fmtDate(p.updated)} />
          <Stat label="License" value={p.license} />
          {p.cohort != null && <Stat label="Cohort" value={String(p.cohort)} />}
        </dl>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-10">
            {/* README */}
            <section>
              <h2 className="mb-3 text-lg font-semibold">Overview</h2>
              <p className="text-pretty leading-relaxed text-ink-300">{p.description}</p>
              {p.hasVideo && p.videoURL && (
                <a
                  href={p.videoURL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-teal hover:underline"
                >
                  <Video className="size-4" aria-hidden="true" /> Watch the demo
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </section>

            {/* Install & Run */}
            <section>
              <h2 className="mb-3 text-lg font-semibold">Install &amp; run</h2>
              <CodeBlock command={installCommand(p)} />
              <p className="mt-2 text-xs text-ink-500">
                Requires {p.runtime === "condor" ? "Condor" : "Hummingbot"}. See the{" "}
                <a href="https://docs.hummingbot.org" target="_blank" rel="noreferrer" className="text-brand-teal hover:underline">
                  docs
                </a>{" "}
                to get set up.
              </p>
            </section>

            {/* Versions */}
            <section>
              <h2 className="mb-3 text-lg font-semibold">Versions</h2>
              <ul className="divide-y divide-ink-900 rounded-lg border border-ink-800">
                {p.versions.map((v, i) => (
                  <li key={v} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-mono">v{v}</span>
                    {i === 0 ? (
                      <Badge variant="brand">latest</Badge>
                    ) : (
                      <span className="text-ink-600">{fmtDate(p.updated)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {related.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Related</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {related.map((r) => (
                    <PrimitiveCard key={`${r.namespace}/${r.name}`} p={r} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-500">Publisher</h2>
              <Link
                href={`/publishers/${p.namespace}`}
                className="block rounded-lg border border-ink-800 bg-card p-4 transition-colors hover:border-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-medium">{p.authorName ?? p.namespace}</p>
                <p className="text-sm text-ink-500" translate="no">@{p.namespace}</p>
                {more > 0 && <p className="mt-1 text-xs text-ink-600">+{more} more primitives</p>}
              </Link>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-500">Compatibility</h2>
              <ul className="flex flex-col gap-1.5 text-sm text-ink-300">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-brand-teal" aria-hidden="true" />
                  Runtime: {p.runtime === "condor" ? "Condor" : "Hummingbot"}
                </li>
                {p.exchanges.length > 0 && (
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-teal" aria-hidden="true" />
                    <span>Exchanges: {p.exchanges.join(", ")}</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-brand-teal" aria-hidden="true" />
                  {p.hasSource ? "Source included" : "No source bundled"}
                </li>
              </ul>
            </section>

            {p.tags.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-500">Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-full bg-ink-900 px-2 py-0.5 text-xs text-ink-400">{t}</span>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
      <HubFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-600">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
