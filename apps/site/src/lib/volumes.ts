import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Parse the vendored hummingbot/datadog CSVs (server-side, at build) into
 * compact aggregates. Collection ended 2026-03-16 — this is a fixed dataset.
 * Only small derived objects are passed to the client; raw CSVs never ship.
 */

export const DATA_WINDOW_END = "2026-03-16";
const dir = join(process.cwd(), "data", "volumes");

function readCsv(file: string): string[][] {
  const text = readFileSync(join(dir, file), "utf8").trim();
  return text.split("\n").map((line) => line.split(","));
}

export type DailyPoint = { date: string; volume: number };
export type Ranked = { name: string; volume: number; share: number };

export type VolumesData = {
  totalVolume: number;
  exchangeCount: number;
  daily: DailyPoint[];
  topExchanges: Ranked[];
  topVersions: Ranked[];
  windowStart: string;
  windowEnd: string;
};

let cache: VolumesData | null = null;

export function getVolumesData(): VolumesData {
  if (cache) return cache;

  const [, ...dailyRows] = readCsv("total_daily_volume.csv");
  const daily: DailyPoint[] = dailyRows
    .filter((r) => r.length >= 2)
    .map((r) => ({ date: r[0]!, volume: Number(r[1]) }));
  const totalVolume = daily.reduce((s, d) => s + d.volume, 0);

  const [, ...exRows] = readCsv("volume_by_exchange.csv");
  const exTotals = new Map<string, number>();
  for (const r of exRows) {
    if (r.length < 3) continue;
    exTotals.set(r[1]!, (exTotals.get(r[1]!) ?? 0) + Number(r[2]));
  }
  const exSum = [...exTotals.values()].reduce((s, v) => s + v, 0);
  const topExchanges: Ranked[] = [...exTotals.entries()]
    .map(([name, volume]) => ({ name, volume, share: volume / exSum }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 25);

  const [, ...verRows] = readCsv("volume_by_version.csv");
  const verTotals = new Map<string, number>();
  for (const r of verRows) {
    if (r.length < 3) continue;
    verTotals.set(r[1]!, (verTotals.get(r[1]!) ?? 0) + Number(r[2]));
  }
  const verSum = [...verTotals.values()].reduce((s, v) => s + v, 0);
  const topVersions: Ranked[] = [...verTotals.entries()]
    .map(([name, volume]) => ({ name, volume, share: volume / verSum }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 15);

  cache = {
    totalVolume,
    exchangeCount: exTotals.size,
    daily,
    topExchanges,
    topVersions,
    windowStart: daily[0]?.date ?? "",
    windowEnd: DATA_WINDOW_END,
  };
  return cache;
}

export function formatUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function capitalize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
