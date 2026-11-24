// Single source of truth for the sponsor exchanges/venues.
//
// These were previously described by three separate lists that drifted apart:
// EXCHANGE_META in RulesPanel.tsx (logos + market type), ELIGIBLE_EXCHANGES and
// EXCHANGE_API_LINKS in hackathon-squads.ts (display copy + connector docs), and
// the seed list in strategy-tags.ts (the values offered by the strategy
// picker). They disagreed on naming — "Gate.io" in two of them, "gate" in the
// third — which is the same class of duplicate the exchange merge script
// cleaned out of the database.
//
// `id` is what gets stored in Strategy.exchanges and must match the column's
// existing convention (lowercase, apart from acronyms like XRPL); `label` is
// display-only. Keep them distinct — getExistingValues unions ids into a
// case-sensitive Set with stored values, so using a label there would show the
// same venue twice in the picker.
//
// This file must stay free of image imports so it can be used from server code;
// logos live with the component that renders them.

export interface SponsorExchange {
  /** Value stored in Strategy.exchanges. */
  id: string
  /** Display name, used in hackathon copy and rules. */
  label: string
  /** Market types available on the venue. */
  type: string
  /** Hummingbot connector guide — how to configure it, not the raw exchange API docs. */
  docsUrl: string
  note: string
}

export const SPONSOR_EXCHANGES: SponsorExchange[] = [
  {
    id: "binance",
    label: "Binance",
    type: "Spot · Perp",
    docsUrl: "https://hummingbot.org/exchanges/binance/",
    note: "Connector setup, API keys, and supported order types.",
  },
  {
    id: "gate",
    label: "Gate",
    type: "Spot · Perp",
    docsUrl: "https://hummingbot.org/exchanges/gate-io/",
    note: "Spot & perpetual connector setup and API keys.",
  },
  {
    id: "hyperliquid",
    label: "Hyperliquid",
    type: "Perp DEX",
    docsUrl: "https://hummingbot.org/exchanges/hyperliquid/",
    note: "Wallet & API key auth, spot and perpetual connectors.",
  },
  {
    id: "derive",
    label: "Derive",
    type: "Perp DEX",
    docsUrl: "https://hummingbot.org/exchanges/derive/",
    note: "Spot & perpetual connector setup for the onchain venue.",
  },
  {
    id: "XRPL",
    label: "XRPL",
    type: "XRPL DEX",
    docsUrl: "https://hummingbot.org/exchanges/xrpl/",
    note: "Connector setup for the XRP Ledger's onchain order book.",
  },
  {
    id: "solana",
    label: "Solana",
    type: "Solana DEX",
    docsUrl: "https://hummingbot.org/gateway/chains/#solana",
    note: "Gateway setup for Solana DEXs — Jupiter, Meteora, Orca, and Raydium.",
  },
  {
    id: "bitget",
    label: "Bitget",
    type: "Spot · Perp",
    docsUrl: "https://hummingbot.org/exchanges/bitget/",
    note: "Spot & perpetual connector setup and API keys.",
  },
]

/** Values seeded into the strategy exchange picker. */
export const SPONSOR_EXCHANGE_IDS = SPONSOR_EXCHANGES.map((e) => e.id)
