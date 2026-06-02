import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Headline reported-volume stats for the home page. The interactive dashboard
 * (/volumes) reads the full vendored CSVs from public/volumes client-side; this
 * server-side helper only needs the small precomputed summary. Collection ended
 * 2026-03-16 — a fixed snapshot of the hummingbot/datadog dataset.
 */

export const DATA_WINDOW_END = "2026-03-16";

/** Headline stats — mirror reporting.hummingbot.org cards. */
export type Stats = {
  totalVolume: number;
  avgDailyVolume: number;
  uniqueExchanges: number;
  uniqueInstances: number;
  days: number;
};

export type VolumesData = {
  /** trailing-365-day window (reporting.hummingbot.org default) */
  lastYear: Stats;
  allTime: Stats;
  windowStart: string;
  windowEnd: string;
};

let cache: VolumesData | null = null;

export function getVolumesData(): VolumesData {
  if (cache) return cache;
  const file = join(process.cwd(), "data", "volumes", "summary.json");
  cache = JSON.parse(readFileSync(file, "utf8")) as VolumesData;
  return cache;
}

// Re-export the client-safe formatters so existing imports from "@/lib/volumes"
// keep working (server pages can import either; client components must import
// from "@/lib/volumes-format" to avoid pulling node:fs into the bundle).
export { formatUsd, capitalize } from "./volumes-format";
