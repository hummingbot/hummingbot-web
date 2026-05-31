import { urls } from "@/config/site";

/** A supported connector: display name + docs slug, grouped by venue type. */
export type Connector = { name: string; slug: string; gateway?: boolean };

export const CONNECTOR_GROUPS: {
  label: string;
  blurb: string;
  items: Connector[];
}[] = [
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

export const CONNECTOR_COUNT = CONNECTOR_GROUPS.reduce(
  (n, g) => n + g.items.length,
  0,
);

/** Docs URL for a connector's reference page (gateway connectors are nested). */
export function connectorHref(e: Connector): string {
  return e.gateway
    ? `${urls.exchangesDocs}/gateway/${e.slug}`
    : `${urls.exchangesDocs}/${e.slug}`;
}
