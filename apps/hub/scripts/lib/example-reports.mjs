/**
 * Example report content for each Condor routine, expressed with the same
 * ReportBuilder calls the real routines make (see condor/routines/*.py). Data
 * is representative sample output — a snapshot of what a single run produces —
 * so the Hub can show prospective users what they'll get before installing.
 */
import { ReportBuilder } from "./report-builder.mjs";

const PLOT_BG = "#161b22";
const PAPER_BG = "#0d1117";
const FONT = { color: "#c9d1d9", size: 10 };

/** market_scanner.py — scatter of NATR vs 24h volume + mature/degen tables. */
function marketScanner() {
  const mature = [
    { pair: "BTC-USDT", vol: "4.2B", chg: "+1.8%", natr: "0.142", natrcv: "0.31", volcv: "0.44", range: "3.1%" },
    { pair: "ETH-USDT", vol: "2.1B", chg: "+2.4%", natr: "0.188", natrcv: "0.36", volcv: "0.51", range: "4.0%" },
    { pair: "SOL-USDT", vol: "980M", chg: "+3.1%", natr: "0.241", natrcv: "0.42", volcv: "0.62", range: "5.2%" },
    { pair: "BNB-USDT", vol: "420M", chg: "+0.9%", natr: "0.166", natrcv: "0.39", volcv: "0.57", range: "3.6%" },
  ];
  const degen = [
    { pair: "WIF-USDT", vol: "310M", chg: "+18.6%", natr: "0.921", natrcv: "1.44", volcv: "2.11", range: "22.4%" },
    { pair: "PEPE-USDT", vol: "260M", chg: "-12.3%", natr: "0.847", natrcv: "1.28", volcv: "1.96", range: "19.8%" },
    { pair: "PNUT-USDT", vol: "140M", chg: "+34.1%", natr: "1.184", natrcv: "1.71", volcv: "2.63", range: "41.2%" },
    { pair: "GOAT-USDT", vol: "88M", chg: "+9.7%", natr: "0.738", natrcv: "1.12", volcv: "1.74", range: "16.9%" },
  ];
  const toRow = (m) => ({
    Pair: m.pair, "Volume 24h": m.vol, "24h Chg": m.chg, NATR: m.natr,
    "NATR-CV": m.natrcv, "Vol-CV": m.volcv, Range: m.range,
  });

  // Scatter: NATR (x) vs Volume in USD (y, log), colored by class.
  const pts = [
    ["BTC", 0.142, 4.2e9, "#3fb950"], ["ETH", 0.188, 2.1e9, "#3fb950"],
    ["SOL", 0.241, 9.8e8, "#3fb950"], ["BNB", 0.166, 4.2e8, "#3fb950"],
    ["XRP", 0.205, 6.1e8, "#8b949e"], ["DOGE", 0.392, 5.4e8, "#8b949e"],
    ["ADA", 0.288, 2.2e8, "#8b949e"], ["LINK", 0.331, 1.9e8, "#8b949e"],
    ["WIF", 0.921, 3.1e8, "#f85149"], ["PEPE", 0.847, 2.6e8, "#f85149"],
    ["PNUT", 1.184, 1.4e8, "#f85149"], ["GOAT", 0.738, 8.8e7, "#f85149"],
  ];
  const data = [
    {
      x: pts.map((p) => p[1]), y: pts.map((p) => p[2]), text: pts.map((p) => p[0]),
      mode: "markers+text", type: "scatter", textposition: "top center",
      textfont: { size: 8, color: "#8b949e" },
      marker: { color: pts.map((p) => p[3]), size: 13, line: { width: 1, color: "#0d1117" } },
      hovertemplate: "%{text}<br>NATR: %{x}%<br>Vol: %{y:.2s}<extra></extra>", showlegend: false,
    },
    { x: [null], y: [null], mode: "markers", type: "scatter", name: "Mature", marker: { color: "#3fb950", size: 10 } },
    { x: [null], y: [null], mode: "markers", type: "scatter", name: "Degen", marker: { color: "#f85149", size: 10 } },
    { x: [null], y: [null], mode: "markers", type: "scatter", name: "Other", marker: { color: "#8b949e", size: 10 } },
  ];
  const layout = {
    title: "Market Scanner — NATR vs Volume (24h)",
    xaxis: { title: "NATR Mean (%)", gridcolor: "#21262d" },
    yaxis: { title: "24h Volume (USD)", type: "log", gridcolor: "#21262d" },
    paper_bgcolor: PAPER_BG, plot_bgcolor: PLOT_BG, font: FONT,
    margin: { l: 60, r: 30, t: 100, b: 40 },
    legend: { orientation: "h", yanchor: "bottom", y: 1.04, xanchor: "right", x: 1 },
  };

  return new ReportBuilder("Market Scanner (24h)")
    .source("routine", "market_scanner")
    .tags(["scanner", "volatility"])
    .markdown("Analyzed 42 pairs with 24h lookback on 1m candles")
    .plotly({ data, layout })
    .markdown("### Mature Markets\nHigh volume, stable volatility")
    .table(mature.map(toRow))
    .markdown("### Degen Markets\nHigh volatility, spiky activity")
    .table(degen.map(toRow))
    .render();
}

/** arb_check.py — CEX vs CEX order-book arb with depth chart + route tables. */
function arbCheck() {
  const depthChart = (() => {
    // Cumulative depth curves around mid for two exchanges.
    const mk = (mid) => {
      const bidsP = [], bidsQ = [], asksP = [], asksQ = [];
      let cum = 0;
      for (let i = 0; i < 20; i++) { cum += 120 + i * 35; bidsP.push(mid - i * 0.012); bidsQ.push(cum); }
      cum = 0;
      for (let i = 0; i < 20; i++) { cum += 110 + i * 38; asksP.push(mid + i * 0.012); asksQ.push(cum); }
      return { bidsP, bidsQ, asksP, asksQ };
    };
    const a = mk(142.18), b = mk(142.31);
    return {
      data: [
        { x: a.bidsP, y: a.bidsQ, mode: "lines", type: "scatter", name: "BINANCE bid", line: { color: "#3fb950" } },
        { x: a.asksP, y: a.asksQ, mode: "lines", type: "scatter", name: "BINANCE ask", line: { color: "#3fb950", dash: "dot" } },
        { x: b.bidsP, y: b.bidsQ, mode: "lines", type: "scatter", name: "KUCOIN bid", line: { color: "#58a6ff" } },
        { x: b.asksP, y: b.asksQ, mode: "lines", type: "scatter", name: "KUCOIN ask", line: { color: "#58a6ff", dash: "dot" } },
      ],
      layout: {
        title: "Order Book Depth — SOL-USDC",
        xaxis: { title: "Price", gridcolor: "#21262d" },
        yaxis: { title: "Cumulative size (SOL)", gridcolor: "#21262d" },
        paper_bgcolor: PAPER_BG, plot_bgcolor: PLOT_BG, font: FONT,
        margin: { l: 60, r: 30, t: 60, b: 40 },
        legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 },
      },
    };
  })();

  return new ReportBuilder("CEX Arb: SOL-USDC (BINANCE vs KUCOIN)")
    .source("routine", "arb_check")
    .tags(["arbitrage", "cex-cex", "SOL-USDC", "binance", "kucoin"])
    .manualOrder()
    .kpi("Exchanges", "2")
    .kpi("Max Mid Diff", "+0.0914%", { delta: "above 0.05% threshold", trend: "up" })
    .kpi("Best Route", "BUY binance → SELL kucoin  +0.0731%", { delta: "profitable", trend: "up" })
    .plotly(depthChart)
    .markdown("## Order Book Comparison (20 levels)")
    .table([
      { Exchange: "BINANCE", "Best Bid": "142.170", "Best Ask": "142.190", Mid: "142.180", "Spread bps": "1.41", "Fill BUY 1.0": "142.191", "Fill SELL 1.0": "142.168" },
      { Exchange: "KUCOIN", "Best Bid": "142.300", "Best Ask": "142.320", Mid: "142.310", "Spread bps": "1.41", "Fill BUY 1.0": "142.322", "Fill SELL 1.0": "142.297" },
    ])
    .markdown("## Arbitrage Routes (sorted by spread)")
    .table([
      { Route: "BUY binance → SELL kucoin", Spread: "+0.0731%", "Profit (1.0 SOL)": "$0.1039" },
      { Route: "BUY kucoin → SELL binance", Spread: "-0.1085%", "Profit (1.0 SOL)": "$-0.1543" },
    ])
    .markdown("## Mid-Price Differences")
    .table([
      { Pair: "binance / kucoin", "Mid A": "142.180", "Mid B": "142.310", Diff: "0.130", "Diff %": "+0.0914%" },
    ])
    .render();
}

/** price_monitor.py — continuous LiveReport: KPI strip + rolling history. */
function priceMonitor() {
  const history = [
    { Time: "14:28:30", Price: "$67,420.00", Change: "+0.04%" },
    { Time: "14:29:10", Price: "$67,512.50", Change: "+0.14%" },
    { Time: "14:29:50", Price: "$67,338.00", Change: "-0.26%" },
    { Time: "14:30:30", Price: "$67,901.20", Change: "+0.84%" },
    { Time: "14:31:10", Price: "$68,240.00", Change: "+0.50%" },
    { Time: "14:31:50", Price: "$68,025.75", Change: "-0.31%" },
    { Time: "14:32:30", Price: "$68,310.40", Change: "+0.42%" },
  ];
  return new ReportBuilder("Price Monitor: BTC-USDT")
    .source("routine", "price_monitor")
    .tags(["monitoring", "live"])
    .manualOrder()
    .kpi("Current Price", "$68,310.40")
    .kpi("High", "$68,420.00", { trend: "up" })
    .kpi("Low", "$67,180.00", { trend: "down" })
    .kpi("Change", "+1.32%", { trend: "up" })
    .kpi("Runtime", "4m 02s")
    .kpi("Alerts", "2")
    .table(history)
    .render();
}

/** error_test.py — intentionally fails; shows how the dashboard renders an error. */
function errorTest() {
  return new ReportBuilder("Error Test")
    .source("routine", "error_test")
    .tags(["testing", "diagnostics"])
    .manualOrder()
    .kpi("Fail Mode", "exception")
    .kpi("Status", "Failed", { trend: "down" })
    .kpi("Delay", "1.0s")
    .markdown(
      "> ❌ **Routine failed — RuntimeError**\n>\n> This is a test error to verify dashboard error alerts work correctly",
    )
    .markdown(
      "This routine intentionally raises the configured failure after a short delay — one of `exception`, `key_error`, `type_error`, `zero_division`, or `timeout`. Use it to confirm that error alerts render correctly in the dashboard and over Telegram. It is **not** a trading routine.",
    )
    .render();
}

export const EXAMPLE_REPORTS = {
  "market-scanner": marketScanner,
  "arb-check": arbCheck,
  "price-monitor": priceMonitor,
  "error-test": errorTest,
};
