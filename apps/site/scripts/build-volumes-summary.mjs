#!/usr/bin/env node
/**
 * Precompute volume headline stats (to match reporting.hummingbot.org) into a
 * small committed summary.json, so we don't ship the 24MB instance CSV.
 *
 *   # fetch the instance CSV once (not committed):
 *   curl -fsSL https://raw.githubusercontent.com/hummingbot/datadog/main/volume_by_instance.csv -o /tmp/vbi.csv
 *   node scripts/build-volumes-summary.mjs /tmp/vbi.csv
 *
 * "Last Year" = trailing 365 days from the last data date (2026-03-16), the
 * same default window reporting.hummingbot.org shows.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "data", "volumes");
const instanceCsv = process.argv[2] || join(dir, "volume_by_instance.csv");

const readCsv = (f) => readFileSync(f, "utf8").trim().split("\n").slice(1).map((l) => l.split(","));

const daily = readCsv(join(dir, "total_daily_volume.csv")).map((r) => ({ date: r[0], v: +r[1] }));
const end = daily[daily.length - 1].date;
const endT = new Date(end).getTime();
const yearAgo = endT - 365 * 864e5;
const sum = (a) => a.reduce((s, r) => s + r.v, 0);

const ex = readCsv(join(dir, "volume_by_exchange.csv"));
const inWin = (d) => new Date(d).getTime() > yearAgo;

function instances(filter) {
  const set = new Set();
  const lines = readFileSync(instanceCsv, "utf8").trim().split("\n").slice(1);
  for (const l of lines) {
    const c = l.split(",");
    if (filter(c[0])) set.add(c[1]);
  }
  return set.size;
}

const lastYearDaily = daily.filter((r) => inWin(r.date));
const summary = {
  windowEnd: end,
  windowStart: daily.find((r) => inWin(r.date))?.date ?? daily[0].date,
  lastYear: {
    totalVolume: sum(lastYearDaily),
    avgDailyVolume: sum(lastYearDaily) / lastYearDaily.length,
    days: lastYearDaily.length,
    uniqueExchanges: new Set(ex.filter((r) => inWin(r[0])).map((r) => r[1])).size,
    uniqueInstances: instances(inWin),
  },
  allTime: {
    totalVolume: sum(daily),
    avgDailyVolume: sum(daily) / daily.length,
    days: daily.length,
    uniqueExchanges: new Set(ex.map((r) => r[1])).size,
    uniqueInstances: instances(() => true),
  },
};

writeFileSync(join(dir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log("[build-volumes-summary] wrote summary.json");
console.log("  lastYear:", JSON.stringify(summary.lastYear));
