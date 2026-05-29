import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Section } from "@hummingbot/ui";
import { formatUsd, getVolumesData } from "@/lib/volumes";

export function VolumesStat() {
  const { totalVolume, exchangeCount, daily } = getVolumesData();

  const stats = [
    { label: "Volume reported", value: formatUsd(totalVolume) },
    { label: "Exchanges", value: `${exchangeCount}` },
    { label: "Days tracked", value: `${daily.length}` },
  ];

  return (
    <Section className="bg-ink-999/40">
      <div className="flex flex-col items-center gap-8 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Real volume, reported by real bots
        </h2>
        <dl className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-ink-800 bg-card p-6">
              <dd className="text-3xl font-bold tabular-nums text-brand-teal sm:text-4xl">
                {s.value}
              </dd>
              <dt className="mt-1 text-sm text-ink-500">{s.label}</dt>
            </div>
          ))}
        </dl>
        <Link
          href="/volumes"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
        >
          View the full dashboard <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}
