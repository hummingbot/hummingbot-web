import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ExchangeDirectory } from "@/components/exchanges/exchange-directory";
import { GradientText } from "@hummingbot/ui";
import { urls } from "@/config/site";
import { EXCHANGES, EXCHANGE_COUNT } from "@/lib/exchanges";

export const metadata: Metadata = {
  title: "Exchanges — Hummingbot",
  description: `The ${EXCHANGE_COUNT}+ centralized and decentralized exchanges Hummingbot connects to — CLOB spot & perpetual order books and AMM/CLMM DEXs, with the market types each supports.`,
};

export default function ExchangesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <header className="mb-10 max-w-3xl">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            <GradientText>Exchanges</GradientText>
          </h1>
          <p className="mt-3 text-pretty text-lg text-ink-400">
            Hummingbot connects to {EXCHANGE_COUNT}+ centralized and decentralized
            exchanges. The same strategies run across CLOB spot &amp; perpetual
            order books and AMM/CLMM DEXs. Pick an exchange to read its connector
            docs.
          </p>
        </header>

        <ExchangeDirectory exchanges={EXCHANGES} />

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
      </main>
      <SiteFooter />
    </>
  );
}
