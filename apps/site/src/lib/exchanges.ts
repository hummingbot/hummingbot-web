import { urls } from "@/config/site";

/** Market types an exchange's Hummingbot connectors can cover. */
export type MarketType = "CLOB Spot" | "CLOB Perp" | "AMM DEX" | "CLMM DEX";

export const MARKET_TYPES: MarketType[] = [
  "CLOB Spot",
  "CLOB Perp",
  "AMM DEX",
  "CLMM DEX",
];

/** A supported exchange: display name, a stable slug, the docs path under
 *  /exchanges, and the market types its connectors support. */
export type Exchange = {
  name: string;
  slug: string;
  /** Path under docs.hummingbot.org/exchanges/ (mirrors mkdocs.yml). */
  docsPath: string;
  types: MarketType[];
};

/**
 * The exchanges Hummingbot supports — the canonical list from the docs site's
 * mkdocs.yml `Exchanges` nav. Market types are derived from the Hummingbot
 * connector codebase: connector/exchange/* → CLOB Spot, connector/derivative/
 * *_perpetual → CLOB Perp, and Gateway DEX route types (amm/clmm) → AMM/CLMM DEX.
 */
export const EXCHANGES: Exchange[] = [
  { name: "Aevo", slug: "aevo", docsPath: "aevo", types: ["CLOB Perp"] },
  { name: "Architect", slug: "architect", docsPath: "architect", types: ["CLOB Perp"] },
  { name: "AscendEx", slug: "ascendex", docsPath: "ascendex", types: ["CLOB Spot"] },
  { name: "Backpack", slug: "backpack", docsPath: "backpack", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "Binance", slug: "binance", docsPath: "binance", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "BingX", slug: "bing-x", docsPath: "bing_x", types: ["CLOB Spot"] },
  { name: "Bitget", slug: "bitget", docsPath: "bitget", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "BitMart", slug: "bitmart", docsPath: "bitmart", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "Bitrue", slug: "bitrue", docsPath: "bitrue", types: ["CLOB Spot"] },
  { name: "Bitstamp", slug: "bitstamp", docsPath: "bitstamp", types: ["CLOB Spot"] },
  { name: "BTC Markets", slug: "btc-markets", docsPath: "btc-markets", types: ["CLOB Spot"] },
  { name: "Bybit", slug: "bybit", docsPath: "bybit", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "Coinbase", slug: "coinbase", docsPath: "coinbase", types: ["CLOB Spot"] },
  { name: "Cube", slug: "cube", docsPath: "cube", types: ["CLOB Spot"] },
  { name: "Decibel", slug: "decibel", docsPath: "decibel", types: ["CLOB Perp"] },
  { name: "Derive", slug: "derive", docsPath: "derive", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "Dexalot", slug: "dexalot", docsPath: "dexalot", types: ["CLOB Spot"] },
  { name: "dYdX", slug: "dydx", docsPath: "dydx", types: ["CLOB Perp"] },
  { name: "Evedex", slug: "evedex", docsPath: "evedex", types: ["CLOB Perp"] },
  { name: "Foxbit", slug: "foxbit", docsPath: "foxbit", types: ["CLOB Spot"] },
  { name: "Gate.io", slug: "gate-io", docsPath: "gate-io", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "GRVT", slug: "grvt", docsPath: "grvt", types: ["CLOB Perp"] },
  { name: "HTX", slug: "htx", docsPath: "htx", types: ["CLOB Spot"] },
  { name: "Hyperliquid", slug: "hyperliquid", docsPath: "hyperliquid", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "Injective", slug: "injective", docsPath: "injective", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "Jupiter", slug: "jupiter", docsPath: "gateway/jupiter", types: ["AMM DEX"] },
  { name: "Kraken", slug: "kraken", docsPath: "kraken", types: ["CLOB Spot"] },
  { name: "KuCoin", slug: "kucoin", docsPath: "kucoin", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "Meteora", slug: "meteora", docsPath: "gateway/meteora", types: ["CLMM DEX"] },
  { name: "MEXC", slug: "mexc", docsPath: "mexc", types: ["CLOB Spot"] },
  { name: "NDAX", slug: "ndax", docsPath: "ndax", types: ["CLOB Spot"] },
  { name: "OKX", slug: "okx", docsPath: "okx", types: ["CLOB Spot", "CLOB Perp"] },
  { name: "Orca", slug: "orca", docsPath: "gateway/orca", types: ["CLMM DEX"] },
  { name: "Pacifica", slug: "pacifica", docsPath: "pacifica", types: ["CLOB Perp"] },
  { name: "PancakeSwap", slug: "pancakeswap", docsPath: "gateway/pancakeswap", types: ["AMM DEX", "CLMM DEX"] },
  { name: "Raydium", slug: "raydium", docsPath: "gateway/raydium", types: ["AMM DEX", "CLMM DEX"] },
  { name: "Uniswap", slug: "uniswap", docsPath: "gateway/uniswap", types: ["AMM DEX", "CLMM DEX"] },
  { name: "Vertex", slug: "vertex", docsPath: "vertex", types: ["CLOB Spot"] },
  { name: "XRP Ledger", slug: "xrpl", docsPath: "xrpl", types: ["CLOB Spot"] },
];

export const EXCHANGE_COUNT = EXCHANGES.length;

/** Docs URL for an exchange's reference page. */
export const exchangeDocsUrl = (e: Exchange): string =>
  `${urls.exchangesDocs}/${e.docsPath}`;
