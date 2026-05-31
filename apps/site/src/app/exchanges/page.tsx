import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GradientText } from "@hummingbot/ui";
import { urls } from "@/config/site";

export const metadata: Metadata = {
  title: "Exchanges — Hummingbot",
  description:
    "Hummingbot connects to 50+ centralized and decentralized exchanges — CLOB CEXs, CLOB DEXs, and AMM/Gateway DEXs. One framework, every major venue.",
};

// Connector display name + docs slug, grouped by venue type. Each links into
// the connector's reference page on the docs site (keeps existing slugs).
type Ex = { name: string; slug: string; gateway?: boolean };
const GROUPS: { label: string; blurb: string; items: Ex[] }[] = [
  {
    label: "Centralized exchanges (CLOB)",
    blurb: "Spot and perpetual order-book venues.",
    items: [
      { name: "Binance", slug: "binance" },
      { name: "Bybit", slug: "bybit" },
      { name: "OKX", slug: "okx" },
      { name: "Gate.io", slug: "gate-io" },
      { name: "KuCoin", slug: "kucoin" },
      { name: "Coinbase", slug: "coinbase" },
      { name: "Kraken", slug: "kraken" },
      { name: "HTX", slug: "htx" },
      { name: "Bitget", slug: "bitget" },
      { name: "MEXC", slug: "mexc" },
      { name: "BitMart", slug: "bitmart" },
      { name: "AscendEx", slug: "ascendex" },
      { name: "Bitrue", slug: "bitrue" },
      { name: "Bitstamp", slug: "bitstamp" },
      { name: "BTC Markets", slug: "btc-markets" },
      { name: "BingX", slug: "bing_x" },
      { name: "Backpack", slug: "backpack" },
      { name: "Cube", slug: "cube" },
      { name: "Foxbit", slug: "foxbit" },
      { name: "NDAX", slug: "ndax" },
      { name: "Architect", slug: "architect" },
    ],
  },
  {
    label: "Decentralized exchanges (CLOB)",
    blurb: "On-chain order-book and RFQ venues.",
    items: [
      { name: "dYdX", slug: "dydx" },
      { name: "Hyperliquid", slug: "hyperliquid" },
      { name: "Vertex", slug: "vertex" },
      { name: "Injective", slug: "injective" },
      { name: "Derive", slug: "derive" },
      { name: "Dexalot", slug: "dexalot" },
      { name: "XRP Ledger", slug: "xrpl" },
      { name: "Aevo", slug: "aevo" },
      { name: "GRVT", slug: "grvt" },
      { name: "Pacifica", slug: "pacifica" },
      { name: "Decibel", slug: "decibel" },
      { name: "Evedex", slug: "evedex" },
    ],
  },
  {
    label: "AMM DEXs (Gateway)",
    blurb: "Automated market makers, via Gateway DEX middleware.",
    items: [
      { name: "Uniswap", slug: "uniswap", gateway: true },
      { name: "Jupiter", slug: "jupiter", gateway: true },
      { name: "Raydium", slug: "raydium", gateway: true },
      { name: "Meteora", slug: "meteora", gateway: true },
      { name: "Orca", slug: "orca", gateway: true },
      { name: "PancakeSwap", slug: "pancakeswap", gateway: true },
      { name: "Curve", slug: "curve", gateway: true },
      { name: "Balancer", slug: "balancer", gateway: true },
      { name: "SushiSwap", slug: "sushiswap", gateway: true },
      { name: "QuickSwap", slug: "quickswap", gateway: true },
      { name: "Trader Joe", slug: "traderjoe", gateway: true },
      { name: "etcSwap", slug: "etcSwap", gateway: true },
    ],
  },
];

function hrefFor(e: Ex): string {
  return e.gateway
    ? `${urls.exchangesDocs}/gateway/${e.slug}`
    : `${urls.exchangesDocs}/${e.slug}`;
}

export default function ExchangesPage() {
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <header className="mb-14 max-w-3xl">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            One framework, <GradientText>every major venue</GradientText>
          </h1>
          <p className="mt-4 text-pretty text-lg text-ink-400">
            Hummingbot connects to {total}+ exchanges out of the box —
            centralized order books, on-chain order books, and AMM DEXs through
            Gateway. The same strategies run across all of them.
          </p>
        </header>

        <div className="flex flex-col gap-12">
          {GROUPS.map((g) => (
            <section key={g.label}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold tracking-tight">{g.label}</h2>
                <span className="text-sm text-ink-500">{g.blurb}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {g.items.map((e) => (
                  <a
                    key={e.slug}
                    href={hrefFor(e)}
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
            </section>
          ))}
        </div>

        <section className="mt-14 rounded-xl border border-ink-800 bg-ink-999/40 p-6 text-center sm:p-8">
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
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
