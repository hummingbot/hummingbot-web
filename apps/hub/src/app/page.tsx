import { Bot, LineChart, Workflow } from "lucide-react";
import Link from "next/link";
import { GradientText } from "@hummingbot/ui";
import { HubFooter, HubHeader } from "@/components/hub-shell";
import { PrimitiveCard } from "@/components/primitive-card";
import { SearchBar } from "@/components/search-bar";
import { allPublishers, countByType, featured, stats, trending } from "@/lib/registry";
import { fmtNum } from "@/lib/types";

const browseCards = [
  { type: "strategy", label: "Strategies", href: "/strategies", icon: LineChart, desc: "Market-making, arbitrage & directional bots." },
  { type: "routine", label: "Routines", href: "/routines", icon: Workflow, desc: "Schedulable Condor workflows." },
  { type: "agent", label: "Agents", href: "/agents", icon: Bot, desc: "Autonomous trading harnesses." },
] as const;

export default function HubHome() {
  const s = stats();
  const pubs = allPublishers().slice(0, 12);

  return (
    <>
      <HubHeader />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center">
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
            <GradientText>Built by the community.</GradientText>
          </h1>
          <p className="max-w-xl text-pretty text-lg text-ink-400">
            Trading strategies, routines, and agents — installable in one command.
          </p>
          <SearchBar />
          <dl className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-ink-500">
            <Stat n={s.primitives} label="primitives" />
            <Stat n={s.publishers} label="publishers" />
            <Stat n={s.certified} label="certified" />
            <Stat n={s.exchanges} label="exchanges" />
          </dl>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3">
          {browseCards.map(({ type, label, href, icon: Icon, desc }) => (
            <Link
              key={type}
              href={href}
              className="group rounded-xl border border-ink-800 bg-card p-6 transition-colors hover:border-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-6 text-brand-teal" aria-hidden="true" />
              <h2 className="mt-4 flex items-baseline gap-2 text-xl font-semibold">
                {label}
                <span className="text-sm font-normal tabular-nums text-ink-500">
                  {countByType(type)}
                </span>
              </h2>
              <p className="mt-1 text-sm text-ink-400">{desc}</p>
            </Link>
          ))}
        </section>

        <Row title="Featured" items={featured()} />
        <Row title="Recently updated" items={trending()} />

        <section className="mx-auto w-full max-w-6xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Top publishers</h2>
          <div className="flex flex-wrap gap-2">
            {pubs.map((p) => (
              <Link
                key={p.handle}
                href={`/publishers/${p.handle}`}
                className="rounded-full border border-ink-800 bg-ink-900 px-3 py-1.5 text-sm text-ink-300 transition-colors hover:border-ink-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                translate="no"
              >
                @{p.handle}{" "}
                <span className="tabular-nums text-ink-600">{p.count}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <HubFooter />
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd className="text-base font-semibold tabular-nums text-foreground">{fmtNum(n)}</dd>
      <dt>{label}</dt>
    </div>
  );
}

function Row({ title, items }: { title: string; items: ReturnType<typeof featured> }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 className="mb-6 text-2xl font-bold tracking-tight">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((p) => (
          <PrimitiveCard key={`${p.namespace}/${p.name}`} p={p} />
        ))}
      </div>
    </section>
  );
}
