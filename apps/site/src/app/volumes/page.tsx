import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { VolumeChart } from "@/components/volumes/volume-chart";
import { capitalize, formatUsd, getVolumesData } from "@/lib/volumes";

export const metadata: Metadata = {
  title: "Volumes — Hummingbot",
  description:
    "Aggregated trading volume reported by Hummingbot instances worldwide.",
};

export default function VolumesPage() {
  const data = getVolumesData();
  const nf = (n: number) => new Intl.NumberFormat("en-US").format(n);
  // Format date-only ISO strings in UTC so e.g. "2026-03-16" never shifts to
  // the prior day in negative-offset timezones (was rendering "March 15" in PT).
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <header className="mb-10">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Reported volumes
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-ink-400">
            Anonymized trading volume reported by Hummingbot instances worldwide,
            through {fmtDate(data.windowEnd)}. No personal information, wallet
            addresses, or API keys are collected.
          </p>
        </header>

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

        <section className="mb-12 rounded-xl border border-ink-800 bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">Daily volume</h2>
          <VolumeChart daily={data.daily} />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <RankTable title="Top exchanges by volume" rows={data.topExchanges} />
          <RankTable title="Volume by version" rows={data.topVersions} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function RankTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; volume: number; share: number }[];
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wider text-ink-500">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 text-right font-medium">Volume</th>
            <th className="py-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-ink-900">
              <td className="py-2 font-medium">{capitalize(r.name)}</td>
              <td className="py-2 text-right tabular-nums text-ink-300">{formatUsd(r.volume)}</td>
              <td className="py-2 text-right tabular-nums text-ink-500">
                {(r.share * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
