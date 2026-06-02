#!/usr/bin/env node
/**
 * Import first-party primitives into src/content/registry.json:
 *   • Condor routines        (condor/routines/*.py)        → type "routine"
 *   • Hummingbot scripts      (hummingbot/scripts/*.py)     → type "strategy", subtype "script"
 *   • Hummingbot v1 strategies (hummingbot/hummingbot/strategy/*) → type "strategy", subtype "v1"
 *
 * Unlike import-botcamp.mjs (community submissions, no code bundled), these are
 * the canonical, open-source primitives that ship with Hummingbot/Condor, so we
 * bundle their real source for in-Hub viewing and — for routines — a rendered
 * example report (see scripts/lib/example-reports.mjs).
 *
 * Usage:
 *   node scripts/import-sources.mjs [--condor <path>] [--hummingbot <path>]
 * Defaults assume the sibling-checkout layout used in development.
 *
 * Idempotent: removes any previously-imported @hummingbot / @condor rows before
 * re-adding, so it can be re-run after upstream changes.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXAMPLE_REPORTS } from "./lib/example-reports.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB = join(HERE, "..");
const argv = process.argv.slice(2);
const arg = (flag, def) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const CONDOR = arg("--condor", join(HUB, "..", "..", "..", "condor"));
const HB = arg("--hummingbot", join(HUB, "..", "..", "..", "hummingbot"));

const REGISTRY = join(HUB, "src", "content", "registry.json");
const SOURCES = join(HUB, "src", "content", "sources");
const REPORTS = join(HUB, "public", "reports");

const TODAY = "2026-05-29";
const langOf = (f) => (f.endsWith(".pyx") || f.endsWith(".pxd") ? "cython" : f.endsWith(".py") ? "python" : "text");

/** Copy a source file into the bundled content tree, return its manifest entry. */
function bundle(plural, namespace, name, srcPath, asName) {
  const fname = asName ?? srcPath.split("/").pop();
  const dir = join(SOURCES, plural, namespace, name);
  mkdirSync(dir, { recursive: true });
  cpSync(srcPath, join(dir, fname));
  const lines = readFileSync(srcPath, "utf8").split("\n").length;
  return { name: fname, lang: langOf(fname), lines };
}

// ── Routines (Condor) ──────────────────────────────────────────────────────

const ROUTINES = [
  {
    name: "market-scanner", file: "market_scanner.py",
    summary: "Scan top perpetual markets by volume, then classify them as mature or degen from volatility (NATR) and volume profiles.",
    description:
      "A one-shot routine that pulls the top markets by 24h volume, fetches 1-minute candles over a configurable lookback, and computes volatility (mean NATR and its coefficient of variation) plus volume dispersion. Markets are ranked and split into “mature” (deep, steady) and “degen” (thin, spiky) buckets — a fast way to pick where a market-making vs. directional approach fits. Emits a report with a NATR-vs-volume scatter and ranked tables.",
    category: "Market Data", continuous: false,
    tags: ["Scanner", "Volatility", "Market Data", "Perp"],
    exchanges: ["binance_perpetual"],
  },
  {
    name: "arb-check", file: "arb_check.py",
    summary: "Compare order books across multiple CEXs to surface cross-exchange arbitrage, with depth-aware fill prices.",
    description:
      "A one-shot routine that fetches order books for a pair across several centralized exchanges, computes mid-price differences and depth-aware fill prices for a target size, then enumerates buy-here/sell-there routes sorted by spread. The report includes a cumulative order-book depth chart, a per-exchange comparison table, and a ranked list of arbitrage routes with estimated profit.",
    category: "Arbitrage", continuous: false,
    tags: ["Arbitrage", "Cross-Exchange", "Order Book"],
    exchanges: ["binance", "kucoin"],
  },
  {
    name: "price-monitor", file: "price_monitor.py",
    summary: "Continuously watch a price and alert when it moves past a threshold, maintaining a live report.",
    description:
      "A continuous routine that polls a connector’s price on a fixed interval and sends an alert whenever the move since the last checkpoint crosses a configurable threshold. It maintains a LiveReport that updates in place — KPI strip (current/high/low/change/runtime/alerts) plus a rolling price history — so a single report stays current instead of spamming one message per tick.",
    category: "Monitoring", continuous: true,
    tags: ["Monitoring", "Alerts", "Live"],
    exchanges: ["binance"],
  },
  {
    name: "error-test", file: "error_test.py",
    summary: "Intentionally fail in several ways to verify the dashboard’s error display.",
    description:
      "A diagnostic routine that raises a chosen failure — a plain exception, a key/type error, division-by-zero, or a hung timeout — after a configurable delay. Use it to confirm that routine error alerts render correctly in the Condor dashboard and over Telegram. Not a trading routine.",
    category: "Other", continuous: false,
    tags: ["Testing", "Diagnostics", "Example"],
    exchanges: [],
  },
];

// ── Hummingbot scripts ──────────────────────────────────────────────────────

const SCRIPTS = [
  { file: "simple_pmm.py", summary: "Minimal pure market-making script: refresh bids/asks around the mid price on a timer.", category: "Market Making", tags: ["Market Making", "Beginner"], exchanges: ["binance"] },
  { file: "simple_vwap.py", summary: "Execute a target amount as a VWAP order, slicing fills over time relative to book volume.", category: "Other", tags: ["Execution", "VWAP"], exchanges: ["binance"] },
  { file: "simple_xemm.py", summary: "Cross-exchange market making (XEMM) starter: quote on the maker venue, hedge on the taker venue.", category: "Cross-Exchange", tags: ["Cross-Exchange", "Market Making"], exchanges: ["binance", "kucoin"] },
  { file: "v2_funding_rate_arb.py", summary: "Capture perpetual funding-rate spreads by holding offsetting positions across venues.", category: "Arbitrage", tags: ["Arbitrage", "Perp", "Funding Rate", "V2"], exchanges: ["binance_perpetual"] },
  { file: "v2_with_controllers.py", summary: "Run one or more V2 controllers together, with a cash-out feature and live config checks.", category: "Other", tags: ["Controllers", "V2"], exchanges: [] },
  { file: "screener_volatility.py", summary: "Screen markets by volatility (NATR) to shortlist trading candidates.", category: "Other", tags: ["Screener", "Volatility"], exchanges: ["binance"] },
  { file: "candles_example.py", summary: "Subscribe to candle feeds and compute indicators as a strategy data source.", category: "Other", tags: ["Example", "Data Feed", "Candles"], exchanges: ["binance"] },
  { file: "amm_data_feed_example.py", summary: "Fetch live DEX prices through the AmmGatewayDataFeed.", category: "Other", tags: ["Example", "Data Feed", "DEX"], exchanges: [] },
  { file: "download_order_book_and_trades.py", summary: "Record historical order-book snapshots and trades for research and backtesting.", category: "Other", tags: ["Data", "Research"], exchanges: ["binance"] },
  { file: "external_events_example.py", summary: "Place buy/sell orders in response to external events via the events plugin.", category: "Other", tags: ["Example", "Events"], exchanges: ["binance"] },
  { file: "format_status_example.py", summary: "Add a custom format_status view and query the live order book.", category: "Other", tags: ["Example", "Status"], exchanges: ["binance"] },
  { file: "log_price_example.py", summary: "Log the best bid/ask of a market to the console on each tick.", category: "Other", tags: ["Example", "Beginner"], exchanges: ["binance"] },
  { file: "backtest_pmm_mister.py", summary: "Backtest the pmm_mister controller, with position-hold support and optional charts.", category: "Market Making", tags: ["Backtesting", "Market Making", "V2"], exchanges: [] },
  { file: "backtest_bollinger_v2.py", summary: "Backtest the bollinger_v2 directional controller with optional chart output.", category: "Directional", tags: ["Backtesting", "Directional", "V2"], exchanges: [] },
  { file: "backtest_grid_strike.py", summary: "Backtest the grid_strike controller with optional chart output.", category: "Directional", tags: ["Backtesting", "Directional", "V2"], exchanges: [] },
  { file: "xrpl_arb_example.py", summary: "Arbitrage XRPL DEX prices against AMM pools, adding liquidity when in range.", category: "Arbitrage", tags: ["Arbitrage", "DEX", "XRPL"], exchanges: ["xrpl"] },
  { file: "xrpl_liquidity_example.py", summary: "Provide AMM liquidity on XRPL when the price sits within a target range.", category: "Liquidity Provision", tags: ["Liquidity Provision", "DEX", "XRPL"], exchanges: ["xrpl"] },
];

// ── Hummingbot v1 strategies ────────────────────────────────────────────────

const V1 = [
  { dir: "pure_market_making", main: "pure_market_making.pyx", cfg: "pure_market_making_config_map.py", summary: "The classic single-exchange market maker: place bids and asks around the mid price with configurable spreads, sizes and refresh.", category: "Market Making", tags: ["Market Making", "V1"] },
  { dir: "avellaneda_market_making", main: "avellaneda_market_making.pyx", cfg: "avellaneda_market_making_config_map_pydantic.py", summary: "Market making driven by the Avellaneda–Stoikov optimal pricing model, adapting spreads to inventory and volatility.", category: "Market Making", tags: ["Market Making", "Avellaneda", "V1"] },
  { dir: "cross_exchange_market_making", main: "cross_exchange_market_making.py", cfg: "cross_exchange_market_making_config_map_pydantic.py", summary: "Quote on a maker exchange and hedge fills with taker orders on another (XEMM), capturing the spread between venues.", category: "Cross-Exchange", tags: ["Cross-Exchange", "Market Making", "V1"] },
  { dir: "cross_exchange_mining", main: "cross_exchange_mining.pyx", cfg: "cross_exchange_mining_config_map_pydantic.py", summary: "A cross-exchange variant tuned to maximize liquidity-mining rewards.", category: "Cross-Exchange", tags: ["Cross-Exchange", "Liquidity Provision", "V1"] },
  { dir: "liquidity_mining", main: "liquidity_mining.py", cfg: "liquidity_mining_config_map.py", summary: "Spread orders across multiple pairs in one exchange to earn liquidity-mining rewards while managing inventory.", category: "Liquidity Provision", tags: ["Liquidity Provision", "V1"] },
  { dir: "perpetual_market_making", main: "perpetual_market_making.py", cfg: "perpetual_market_making_config_map.py", summary: "Market making on perpetual-swap markets, with leverage and position management.", category: "Market Making", tags: ["Market Making", "Perp", "V1"] },
  { dir: "spot_perpetual_arbitrage", main: "spot_perpetual_arbitrage.py", cfg: "spot_perpetual_arbitrage_config_map.py", summary: "Arbitrage price differences between a spot market and its perpetual swap.", category: "Arbitrage", tags: ["Arbitrage", "Perp", "V1"] },
  { dir: "amm_arb", main: "amm_arb.py", cfg: "amm_arb_config_map.py", summary: "Arbitrage between an on-chain AMM/DEX (via Gateway) and a centralized exchange.", category: "Arbitrage", tags: ["Arbitrage", "DEX", "V1"] },
  { dir: "hedge", main: "hedge.py", cfg: "hedge_config_map_pydantic.py", summary: "Hedge inventory exposure on one connector using offsetting orders on others.", category: "Other", tags: ["Hedging", "V1"] },
];

// ── Build ───────────────────────────────────────────────────────────────────

const repo = (base, ...p) => `https://github.com/hummingbot/${base}/blob/main/${p.join("/")}`;
const newPrimitives = [];

// Clean previously-imported bundled sources & reports for a deterministic re-run.
for (const ns of ["hummingbot", "condor"]) {
  rmSync(join(SOURCES, "strategies", ns), { recursive: true, force: true });
  rmSync(join(SOURCES, "routines", ns), { recursive: true, force: true });
}
mkdirSync(REPORTS, { recursive: true });

// Routines
for (const r of ROUTINES) {
  const src = join(CONDOR, "routines", r.file);
  const files = [bundle("routines", "condor", r.name, src)];
  const reportName = `condor__${r.name}.html`;
  writeFileSync(join(REPORTS, reportName), EXAMPLE_REPORTS[r.name]());
  newPrimitives.push({
    type: "routine", namespace: "condor", name: r.name,
    summary: r.summary, description: r.description,
    tags: r.tags, exchanges: r.exchanges, categories: [r.category],
    license: "Apache-2.0", runtime: "condor", latest: "1.0.0", versions: ["1.0.0"],
    updated: TODAY, certified: true, hasSource: true, hasVideo: false,
    authorName: "Hummingbot Foundation",
    subtype: "routine", continuous: r.continuous,
    repoURL: repo("condor", "routines", r.file),
    reportURL: `/reports/${reportName}`,
    files,
  });
}

// Scripts
for (const s of SCRIPTS) {
  const name = s.file.replace(/\.py$/, "").replace(/_/g, "-");
  const files = [bundle("strategies", "hummingbot", name, join(HB, "scripts", s.file))];
  newPrimitives.push({
    type: "strategy", namespace: "hummingbot", name,
    summary: s.summary, description: s.summary,
    tags: s.tags, exchanges: s.exchanges, categories: [s.category],
    license: "Apache-2.0", runtime: "hummingbot", latest: "1.0.0", versions: ["1.0.0"],
    updated: TODAY, certified: true, hasSource: true, hasVideo: false,
    authorName: "Hummingbot Foundation",
    subtype: "script",
    repoURL: repo("hummingbot", "scripts", s.file),
    files,
  });
}

// v1 strategies
for (const v of V1) {
  const name = v.dir.replace(/_/g, "-");
  const base = join(HB, "hummingbot", "strategy", v.dir);
  const files = [bundle("strategies", "hummingbot", name, join(base, v.main))];
  if (v.cfg) files.push(bundle("strategies", "hummingbot", name, join(base, v.cfg)));
  newPrimitives.push({
    type: "strategy", namespace: "hummingbot", name,
    summary: v.summary, description: v.summary,
    tags: v.tags, exchanges: [], categories: [v.category],
    license: "Apache-2.0", runtime: "hummingbot", latest: "1.0.0", versions: ["1.0.0"],
    updated: TODAY, certified: true, hasSource: true, hasVideo: false,
    authorName: "Hummingbot Foundation",
    subtype: "v1",
    repoURL: repo("hummingbot", "hummingbot", "strategy", v.dir),
    files,
  });
}

// ── Merge into registry.json ─────────────────────────────────────────────────

const data = JSON.parse(readFileSync(REGISTRY, "utf8"));
const FIRST_PARTY = new Set(["hummingbot", "condor"]);

// Drop any prior first-party rows, keep community/Botcamp rows untouched.
data.primitives = data.primitives.filter((p) => !FIRST_PARTY.has(p.namespace));
data.primitives.push(...newPrimitives);

const ensurePublisher = (handle, name, bio) => {
  const existing = data.publishers.find((p) => p.handle === handle);
  if (existing) Object.assign(existing, { name, bio });
  else data.publishers.push({ handle, name, bio, joined: "2019-04-01" });
};
ensurePublisher("hummingbot", "Hummingbot Foundation", "The team behind the open-source Hummingbot client — official scripts and v1 strategies.");
ensurePublisher("condor", "Condor", "Condor by Hummingbot — built-in routines for market analysis, monitoring, and reporting.");

data.publishers.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(REGISTRY, JSON.stringify(data, null, 2) + "\n");

const byType = newPrimitives.reduce((m, p) => ((m[p.subtype] = (m[p.subtype] ?? 0) + 1), m), {});
console.log(`[import-sources] +${newPrimitives.length} first-party primitives`, byType);
console.log(`  registry total: ${data.primitives.length} primitives, ${data.publishers.length} publishers`);
