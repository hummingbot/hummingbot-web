"use client";

import { useState } from "react";
import { CopyButton, cn } from "@hummingbot/ui";

/** Perpetual venues with a Hummingbot connector, as the client names them. */
const VENUES = [
  { name: "Binance", connector: "binance_perpetual", pair: "BTC-USDT" },
  { name: "Hyperliquid", connector: "hyperliquid_perpetual", pair: "BTC-USD" },
  { name: "OKX", connector: "okx_perpetual", pair: "BTC-USDT" },
  { name: "Bybit", connector: "bybit_perpetual", pair: "BTC-USDT" },
  { name: "Bitget", connector: "bitget_perpetual", pair: "BTC-USDT" },
  { name: "Gate.io", connector: "gate_io_perpetual", pair: "BTC-USDT" },
  { name: "KuCoin", connector: "kucoin_perpetual", pair: "BTC-USDT" },
  { name: "dYdX", connector: "dydx_v4_perpetual", pair: "BTC-USD" },
] as const;

type Line = { key?: string; value: string; changes?: boolean; comment?: string };

function configLines(connector: string, pair: string): Line[] {
  return [
    { key: "controller_name", value: "pmm_simple" },
    { key: "controller_type", value: "market_making" },
    { key: "connector_name", value: connector, changes: true },
    { key: "trading_pair", value: pair, changes: true },
    { key: "total_amount_quote", value: "1000" },
    { key: "buy_spreads", value: "[0.001, 0.002]" },
    { key: "sell_spreads", value: "[0.001, 0.002]" },
    { key: "leverage", value: "5" },
    { key: "stop_loss", value: "0.03" },
    { key: "take_profit", value: "0.02" },
  ];
}

/**
 * The home's code panel, in the CCXT manner: a real Hummingbot V2 controller
 * config (pmm_simple, as the controller walkthrough creates it), where picking
 * another venue changes only the connector and pair. Below it, the two Hummingbot
 * API calls that backtest and deploy that same file.
 */
export function ConfigSwitcher() {
  const [index, setIndex] = useState(0);
  const venue = VENUES[index];
  const lines = configLines(venue.connector, venue.pair);
  const yaml = lines.map((l) => `${l.key}: ${l.value}`).join("\n");

  return (
    <div className="min-w-0">
      {/* Follows the theme: syntax colors come from the --code-* tokens in
          globals.css (hbui blues and teals on light, brighter ones on dark). */}
      <div className="hub-card overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-muted-foreground/25" />
              <span className="size-2.5 rounded-full bg-muted-foreground/25" />
              <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            </span>
            <span className="font-mono text-xs text-muted-foreground">conf/controllers/pmm_btc.yml</span>
          </span>
          <CopyButton value={yaml} className="text-muted-foreground hover:text-foreground" />
        </div>

        <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-6 md:text-sm">
          <code>
            {lines.map((l) => (
              <span key={l.key} className={cn("block", l.changes && "-mx-5 bg-primary/10 px-5")}>
                <span className="text-[color:var(--code-key)]">{l.key}</span>
                <span className="text-[color:var(--code-comment)]">: </span>
                <span
                  className={
                    l.changes ? "font-semibold text-[color:var(--code-accent)]" : "text-[color:var(--code-value)]"
                  }
                >
                  {l.value}
                </span>
              </span>
            ))}
          </code>
        </pre>

        <div className="border-t border-border bg-muted/50 px-5 py-4 font-mono text-[12px] leading-6 md:text-[13px]">
          <span className="block text-[color:var(--code-comment)]"># Same file, with the Hummingbot API:</span>
          <span className="block">
            <span className="font-semibold text-[color:var(--code-accent)]">POST</span>{" "}
            <span className="text-foreground">/backtesting/run</span>
            <span className="text-[color:var(--code-comment)]">{"  "}# historical candles</span>
          </span>
          <span className="block">
            <span className="font-semibold text-[color:var(--code-accent)]">POST</span>{" "}
            <span className="text-foreground">/bot-orchestration/deploy-v2-controllers</span>
            <span className="text-[color:var(--code-comment)]">{"  "}# live</span>
          </span>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Pick a venue, change one line
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Exchange">
          {VENUES.map((v, i) => (
            <button
              key={v.connector}
              type="button"
              role="radio"
              aria-checked={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === index
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full", i === index ? "bg-primary" : "bg-muted-foreground/40")}
              />
              {v.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
