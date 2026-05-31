import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { VolumeChart } from "@/components/volumes/volume-chart";
import { RankTable } from "@/components/volumes/rank-table";
import { GradientText } from "@hummingbot/ui";
import { urls } from "@/config/site";
import { formatUsd, getVolumesData } from "@/lib/volumes";
import { CONNECTOR_COUNT, CONNECTOR_GROUPS, connectorHref } from "@/lib/exchanges";

export const metadata: Metadata = {
  title: "Exchanges & Volumes — Hummingbot",
  description:
    "Aggregated trading volume reported by Hummingbot instances worldwide, plus the 45+ centralized and decentralized exchanges Hummingbot connects to.",
};

export default function ExchangesPage() {
  const data = getVolumesData();
  const nf = (n: number) => new Intl.NumberFormat("en-US").format(n);
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(
      new Date(iso),
    );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <header className="mb-10 max-w-3xl">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            <GradientText>Exchanges</GradientText> & volumes
          </h1>
          <p className="mt-3 text-pretty text-lg text-ink-400">
            Hummingbot connects to {CONNECTOR_COUNT}+ centralized and
            decentralized exchanges. Below is the anonymized trading volume those
            instances report worldwide, through {fmtDate(data.windowEnd)} — no
            personal information, wallet addresses, or API keys are collected.
          </p>
        </header>

        {/* Headline stats */}
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-500">
          Last year · through {fmtDate(data.windowEnd)}
        </p>
        <dl className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total Volume", value: formatUsd(data.lastYear.totalVolume) },
            { label: "Unique Exchanges", value: nf(data.lastYear.uniqueExchanges) },
            { label: "Unique Instances", value: nf(data.lastYear.uniqueInstances) },
            { label: "Avg Daily Volume", value: formatUsd(data.lastYear.avgDailyVolume) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-ink-800 bg-card p-6">
              <dd className="text-3xl font-bold tabular-nums text-brand-teal">{s.value}</dd>
              <dt className="mt-1 text-sm text-ink-500">{s.label}</dt>
            </div>
          ))}
        </dl>

        {/* Chart */}
        <section className="mb-12 rounded-xl border border-ink-800 bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">Daily volume</h2>
          <VolumeChart daily={data.daily} />
        </section>

        {/* Tables (show first 5, then expand) */}
        <div className="mb-16 grid gap-8 lg:grid-cols-2">
          <RankTable title="Top exchanges by volume" rows={data.topExchanges} initial={5} />
          <RankTable title="Volume by version" rows={data.topVersions} initial={5} />
        </div>

        {/* Connector list */}
        <section>
          <div className="mb-6 max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">
              One framework, <GradientText>every major venue</GradientText>
            </h2>
            <p className="mt-2 text-pretty text-ink-400">
              The same strategies run across centralized order books, on-chain
              order books, and AMM DEXs through Gateway.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {CONNECTOR_GROUPS.map((g) => (
              <div key={g.label}>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold tracking-tight">{g.label}</h3>
                  <span className="text-sm text-ink-500">{g.blurb}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {g.items.map((e) => (
                    <a
                      key={e.slug}
                      href={connectorHref(e)}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between rounded-lg border border-ink-800 bg-card px-4 py-3 text-sm text-ink-300 transition-colors hover:border-ink-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {e.name}
                      <ArrowUpRight
                        className="size-3.5 shrink-0 text-ink-600 transition-colors group-hover:text-brand-teal"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-ink-800 bg-ink-999/40 p-6 text-center sm:p-8">
            <h2 className="text-xl font-bold tracking-tight">Don&apos;t see your exchange?</h2>
            <p className="mx-auto mt-2 max-w-xl text-pretty text-ink-400">
              New connectors are funded through the Foundation&apos;s bounty
              program. Sponsor a connector or build one to earn rewards.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/bounties"
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-teal px-4 py-2 text-sm font-semibold text-ink-999 transition-opacity hover:opacity-90"
              >
                How bounties work
              </a>
              <a
                href={urls.exchangesDocs}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
              >
                Full connector docs
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
