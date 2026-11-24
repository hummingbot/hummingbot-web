import Link from "next/link";
import { ArrowRight, Bot, CandlestickChart, FlaskConical, Network, type LucideIcon } from "lucide-react";
import { urls } from "@/config/site";
import { EXCHANGE_COUNT } from "@/lib/exchanges";
import { ConfigSwitcher } from "./config-switcher";

// What the framework gives a market maker, one line each, to the page that shows it.
const PILLARS: { Icon: LucideIcon; title: string; body: string; href: string }[] = [
  {
    Icon: CandlestickChart,
    title: "Market making strategies",
    body: "Pure and cross-exchange market making, grids, arbitrage and DEX liquidity.",
    href: `${urls.docs}/documentation/strategies/v2-strategies/controllers`,
  },
  {
    Icon: Network,
    title: `${EXCHANGE_COUNT}+ exchanges`,
    body: "CEX and DEX connectors. Moving a strategy is one line of config.",
    href: urls.exchanges,
  },
  {
    Icon: FlaskConical,
    title: "Backtest, then go live",
    body: "Test on historical candles, then deploy on your own keys.",
    href: `${urls.docs}/documentation/hummingbot-api`,
  },
  {
    Icon: Bot,
    title: "Agents that run it",
    body: "Condor runs your bots and AI agents and reports on Telegram.",
    href: `${urls.docs}/condor/introduction`,
  },
];

/**
 * "What is Hummingbot": more than a trading engine. A centered heading, four
 * cards (one line each, as Nautilus lays out its features), and the config
 * panel under them showing what a strategy looks like.
 */
export function WhatIsSection() {
  return (
    <section id="what-is-hummingbot" className="w-full scroll-mt-16 border-b border-border bg-card py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            What is Hummingbot
          </p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
            More than a trading engine.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            Most frameworks give you an engine. Hummingbot gives you the market making strategies too.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ Icon, title, body, href }) => (
            <li key={title}>
              <Link
                href={href}
                {...(/^https?:/.test(href) ? { target: "_blank", rel: "noreferrer" } : {})}
                className="hub-card group flex h-full flex-col rounded-2xl border border-border bg-background p-6 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-5 text-lg font-semibold tracking-tight">{title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</span>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">
                  Learn more
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-16 max-w-3xl">
          <ConfigSwitcher />
        </div>
      </div>
    </section>
  );
}
