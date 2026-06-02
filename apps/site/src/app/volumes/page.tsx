import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { VolumesDashboard } from "@/components/volumes/volumes-dashboard";
import { GradientText } from "@hummingbot/ui";

export const metadata: Metadata = {
  title: "Reported Volumes — Hummingbot",
  description:
    "Anonymized, aggregated trading volume reported by Hummingbot instances worldwide — by exchange, version, and instance, over time. No personal data, wallet addresses, or API keys are collected.",
};

export default function VolumesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Reported <GradientText>volumes</GradientText>
          </h1>
          <p className="mt-3 text-pretty text-lg text-ink-400">
            Anonymized, aggregated trading volume that Hummingbot instances report
            worldwide — across both official releases and community forks. No
            personal information, wallet addresses, or API keys are collected.
          </p>
        </header>

        <VolumesDashboard />

        <p className="mt-8 text-sm text-ink-500">
          Source data:{" "}
          <a
            href="https://github.com/hummingbot/datadog"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-brand-teal hover:underline"
          >
            hummingbot/datadog
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
