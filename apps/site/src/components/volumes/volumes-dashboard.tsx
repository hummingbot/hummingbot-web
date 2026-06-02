"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApexOptions } from "apexcharts";
import Papa from "papaparse";
import { BarChart2, ChevronDown, Layers, Search, Server, TrendingUp } from "lucide-react";
import { cn } from "@hummingbot/ui";

// ── types ─────────────────────────────────────────────────────────────────────
type ExRow = { date: string; exchange: string; volume_usdt: number };
type VerRow = { date: string; version: string; volume_usdt: number };
type DayCount = { date: string; active_instances: number };
type InstTotal = { instance_id: string; volume_usdt: number };
type Meta = { uniqueInstancesAllTime: number; windowStart: string; windowEnd: string };

const RANGES = [
  { value: "all", label: "All Time" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "180", label: "Last 6 Months" },
  { value: "365", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
] as const;

// Fixed, saturated series palette (legible on light + dark) — from the source dashboard.
const SERIES = [
  "#5FFFD7", "#FCDB17", "#E549FF", "#00C2CE", "#22c55e",
  "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#14b8a6", "#f97316", "#06b6d4", "#84cc16", "#a855f7",
];
const colorAt = (i: number) => SERIES[i % SERIES.length];

/** A titled chart surface; ApexCharts mounts into `innerRef`. Module-scoped so
 *  it isn't recreated each render (which would detach the mounted charts). */
function ChartCard({
  title,
  hint,
  innerRef,
}: {
  title: string;
  hint?: string;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="rounded-xl border border-ink-800 bg-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-2 text-xs text-ink-500">{hint}</p>}
      <div ref={innerRef} />
    </section>
  );
}

function formatVolume(v: number): string {
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(2) + "K";
  return "$" + v.toFixed(2);
}

const csv = async <T,>(path: string): Promise<T[]> => {
  const text = await (await fetch(path)).text();
  return Papa.parse<T>(text, { header: true, dynamicTyping: true, skipEmptyLines: true }).data;
};

/** Read theme colors from the live CSS vars so charts re-theme with the site. */
function palette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  return {
    isLight,
    mode: (isLight ? "light" : "dark") as "light" | "dark",
    fg: `hsl(${v("--foreground")})`,
    fgMuted: v("--ink-400"),
    border: `hsl(${v("--border")})`,
    primary: v("--brand-teal"),
    bgElev: `hsl(${v("--card")})`,
    mutedSlice: isLight ? "#cbd5e1" : "#3f3f46",
  };
}

export function VolumesDashboard() {
  const [exData, setExData] = useState<ExRow[]>([]);
  const [verData, setVerData] = useState<VerRow[]>([]);
  const [active, setActive] = useState<DayCount[]>([]);
  const [instTotals, setInstTotals] = useState<InstTotal[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [allExchanges, setAllExchanges] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [range, setRange] = useState<string>("365");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [themeTick, setThemeTick] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [stats, setStats] = useState({ total: "-", exchanges: "-", instances: "-", avg: "-", dateRange: "" });
  const [table, setTable] = useState<{ exchange: string; volume: number; share: number; bar: number }[]>([]);

  const dailyRef = useRef<HTMLDivElement>(null);
  const exchangeRef = useRef<HTMLDivElement>(null);
  const versionRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  // ApexCharts instances, keyed by chart id
  const charts = useRef<Record<string, { destroy: () => void }>>({});

  // ── load vendored CSVs once ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ex, ver, act, inst, m] = await Promise.all([
        csv<ExRow>("/volumes/volume_by_exchange.csv"),
        csv<VerRow>("/volumes/volume_by_version.csv"),
        csv<DayCount>("/volumes/active_instances_daily.csv"),
        csv<InstTotal>("/volumes/instance_totals.csv"),
        fetch("/volumes/volumes_meta.json").then((r) => r.json() as Promise<Meta>),
      ]);
      if (cancelled) return;
      const exRows = ex.filter((r) => r.date && r.exchange && r.volume_usdt != null);
      const totals: Record<string, number> = {};
      for (const r of exRows) totals[r.exchange] = (totals[r.exchange] ?? 0) + r.volume_usdt;
      const names = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([n]) => n);
      setExData(exRows);
      setVerData(ver.filter((r) => r.date && r.version && r.volume_usdt != null));
      setActive(act.filter((r) => r.date && r.active_instances != null));
      setInstTotals(inst.filter((r) => r.instance_id && r.volume_usdt != null));
      setMeta(m);
      setAllExchanges(names);
      setSelected(new Set(names));
      setCustomStart(m.windowStart);
      setCustomEnd(m.windowEnd);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // re-render charts when the site theme flips
  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((t) => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("#exchange-multi-select")) setDropdownOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [dropdownOpen]);

  const inRange = useCallback(
    (dateStr: string): boolean => {
      if (range === "all" || !meta) return true;
      const max = new Date(meta.windowEnd);
      let start: Date;
      let end = max;
      if (range === "custom") {
        start = new Date(customStart);
        end = new Date(customEnd);
      } else {
        start = new Date(max);
        start.setDate(start.getDate() - parseInt(range));
      }
      const d = new Date(dateStr);
      return d >= start && d <= end;
    },
    [range, customStart, customEnd, meta],
  );

  // ── compute + render on any filter/theme change ──────────────────────────────
  useEffect(() => {
    if (!loaded || !meta) return;
    let disposed = false;

    (async () => {
      const ApexCharts = (await import("apexcharts")).default;
      if (disposed) return;
      const p = palette();
      const mono = "ui-monospace, SF Mono, JetBrains Mono, monospace";

      const mount = (id: string, el: HTMLDivElement | null, options: ApexOptions) => {
        if (!el) return;
        charts.current[id]?.destroy();
        const c = new ApexCharts(el, options);
        c.render();
        charts.current[id] = c;
      };

      // selected exchanges within range
      const exFiltered = exData.filter((r) => selected.has(r.exchange) && inRange(r.date));

      // — stat cards + daily series —
      const dailyTotals: Record<string, number> = {};
      for (const r of exFiltered) dailyTotals[r.date] = (dailyTotals[r.date] ?? 0) + r.volume_usdt;
      const dates = Object.keys(dailyTotals).sort();
      const values = dates.map((d) => dailyTotals[d]);
      const total = values.reduce((a, b) => a + b, 0);
      const uniqueExchanges = new Set(exFiltered.map((r) => r.exchange)).size;
      setStats({
        total: formatVolume(total),
        exchanges: uniqueExchanges.toLocaleString(),
        instances: meta.uniqueInstancesAllTime.toLocaleString(),
        avg: formatVolume(values.length ? total / values.length : 0),
        dateRange: dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : "",
      });

      const axis = {
        labels: { style: { colors: p.fgMuted, fontFamily: mono } },
        axisBorder: { color: p.border },
        axisTicks: { color: p.border },
      };

      // 1) daily volume (area, zoomable)
      mount("daily", dailyRef.current, {
        series: [{ name: "Daily Volume", data: dates.map((d, i) => ({ x: new Date(d).getTime(), y: values[i] })) }],
        chart: { type: "area", height: 350, background: "transparent", fontFamily: mono, toolbar: { show: true }, animations: { enabled: true, speed: 300 } },
        colors: [p.primary],
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05, stops: [0, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2 },
        xaxis: { type: "datetime", ...axis, labels: { ...axis.labels, datetimeFormatter: { month: "MMM 'yy" } } },
        yaxis: { labels: { style: { colors: p.fgMuted, fontFamily: mono }, formatter: (v: number) => formatVolume(v) } },
        grid: { borderColor: p.border, strokeDashArray: 3 },
        tooltip: { theme: p.mode, x: { format: "MMM dd, yyyy" }, y: { formatter: (v: number) => formatVolume(v) } },
      });

      // 2) volume by exchange (horizontal bar, top 15)
      const exTotals: Record<string, number> = {};
      for (const r of exFiltered) exTotals[r.exchange] = (exTotals[r.exchange] ?? 0) + r.volume_usdt;
      const exSorted = Object.entries(exTotals).sort((a, b) => b[1] - a[1]).slice(0, 15);
      mount("exchange", exchangeRef.current, {
        series: [{ name: "Volume", data: exSorted.map(([, v]) => v) }],
        chart: { type: "bar", height: 420, background: "transparent", fontFamily: mono, toolbar: { show: true } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true, barHeight: "70%" } },
        colors: exSorted.map((_, i) => colorAt(i)),
        dataLabels: { enabled: true, formatter: (v: number) => formatVolume(v), style: { colors: ["#0f172a"], fontFamily: mono, fontWeight: 600 }, offsetX: 8 },
        xaxis: { categories: exSorted.map(([n]) => n), labels: { style: { colors: p.fgMuted, fontFamily: mono }, formatter: (v: number) => formatVolume(v) } },
        yaxis: { labels: { style: { colors: p.fg, fontFamily: mono } } },
        grid: { borderColor: p.border, strokeDashArray: 3 },
        tooltip: { theme: p.mode, y: { formatter: (v: number) => formatVolume(v) } },
        legend: { show: false },
      });

      // table (selected exchanges in range)
      const grand = Object.values(exTotals).reduce((a, b) => a + b, 0);
      const maxVol = exSorted.length ? exSorted[0][1] : 1;
      setTable(
        Object.entries(exTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([exchange, volume]) => ({ exchange, volume, share: grand ? (volume / grand) * 100 : 0, bar: maxVol ? (volume / maxVol) * 100 : 0 })),
      );

      // 3) volume by version (donut, range-only, top 15 + others)
      const verFiltered = verData.filter((r) => inRange(r.date));
      const verTotals: Record<string, number> = {};
      for (const r of verFiltered) verTotals[r.version] = (verTotals[r.version] ?? 0) + r.volume_usdt;
      const verSorted = Object.entries(verTotals).sort((a, b) => b[1] - a[1]);
      const verTop = verSorted.slice(0, 15);
      const verRest = verSorted.slice(15);
      const verLabels = verTop.map(([v]) => v);
      const verValues = verTop.map(([, v]) => v);
      if (verRest.length) {
        verLabels.push(`${verRest.length} other versions`);
        verValues.push(verRest.reduce((s, [, v]) => s + v, 0));
      }
      const verGrand = verValues.reduce((a, b) => a + b, 0);
      mount("version", versionRef.current, {
        series: verValues,
        labels: verLabels,
        chart: { type: "donut", height: 480, background: "transparent", fontFamily: mono },
        colors: verLabels.map((_, i) => (i === verLabels.length - 1 && verRest.length ? p.mutedSlice : colorAt(i))),
        stroke: { colors: [p.bgElev], width: 2 },
        dataLabels: { enabled: true, formatter: (val: number, opts) => (!opts || (val as number) < 3 ? "" : (opts.w.globals.labels[opts.seriesIndex] as string)), style: { fontFamily: mono, fontSize: "11px", fontWeight: 600, colors: ["#0f172a"] }, dropShadow: { enabled: false } },
        plotOptions: { pie: { donut: { size: "60%", labels: { show: true, name: { show: true, fontFamily: mono, color: p.fgMuted }, value: { show: true, fontFamily: mono, fontSize: "1.5rem", fontWeight: 600, color: p.fg, formatter: (v: string) => formatVolume(Number(v)) }, total: { show: true, showAlways: true, label: "Total", fontFamily: mono, color: p.fgMuted, formatter: () => formatVolume(verGrand) } } } } },
        legend: { position: "right", fontFamily: mono, fontSize: "12px", labels: { colors: p.fg }, markers: { size: 5 }, formatter: (name: string, opts) => (opts ? `${name} — ${formatVolume(opts.w.globals.series[opts.seriesIndex] as number)}` : name) },
        tooltip: { theme: p.mode, y: { formatter: (v: number) => formatVolume(v) } },
      });

      // 4) instance treemap (all-time top 30 + others, from compact rollup)
      const instSansOthers = instTotals.filter((r) => r.instance_id !== "(others)");
      const instSorted = [...instSansOthers].sort((a, b) => b.volume_usdt - a.volume_usdt);
      const top = instSorted.slice(0, 30);
      const restTotal =
        instSorted.slice(30).reduce((s, r) => s + r.volume_usdt, 0) +
        (instTotals.find((r) => r.instance_id === "(others)")?.volume_usdt ?? 0);
      const treeData = top.map((r) => ({ x: r.instance_id.length > 14 ? r.instance_id.slice(0, 12) + "…" : r.instance_id, y: r.volume_usdt, fullId: r.instance_id }));
      if (restTotal > 0) treeData.push({ x: "others", y: restTotal, fullId: "remaining instances" });
      mount("instance", instanceRef.current, {
        series: [{ data: treeData }],
        chart: { type: "treemap", height: 420, background: "transparent", fontFamily: mono, toolbar: { show: true } },
        colors: treeData.map((_, i) => (i === treeData.length - 1 && restTotal > 0 ? p.mutedSlice : colorAt(i))),
        plotOptions: { treemap: { distributed: true, enableShades: false } },
        dataLabels: { enabled: true, style: { fontFamily: mono, fontSize: "11px", fontWeight: 500, colors: ["#0f172a"] }, formatter: ((text: string, op: { value: number }) => [text, formatVolume(op.value)]) as unknown as (val: string) => string, offsetY: -4 },
        tooltip: { theme: p.mode, y: { formatter: (v: number) => formatVolume(v) } },
        legend: { show: false },
      });

      // 5) active instances per day (bar, range-filtered)
      const actFiltered = active.filter((r) => inRange(r.date)).sort((a, b) => a.date.localeCompare(b.date));
      mount("active", activeRef.current, {
        series: [{ name: "Active Instances", data: actFiltered.map((r) => ({ x: new Date(r.date).getTime(), y: r.active_instances })) }],
        chart: { type: "bar", height: 420, background: "transparent", fontFamily: mono, toolbar: { show: true } },
        colors: ["#E549FF"],
        plotOptions: { bar: { columnWidth: "80%", borderRadius: 1 } },
        dataLabels: { enabled: false },
        xaxis: { type: "datetime", ...axis, labels: { ...axis.labels, datetimeFormatter: { month: "MMM 'yy" } } },
        yaxis: { labels: { style: { colors: p.fgMuted, fontFamily: mono }, formatter: (v: number) => Math.round(v).toLocaleString() } },
        grid: { borderColor: p.border, strokeDashArray: 3 },
        tooltip: { theme: p.mode, x: { format: "MMM dd, yyyy" }, y: { formatter: (v: number) => `${v.toLocaleString()} instances` } },
        legend: { show: false },
      });
    })();

    return () => {
      disposed = true;
    };
  }, [loaded, meta, exData, verData, active, instTotals, selected, inRange, themeTick]);

  // cleanup on unmount
  useEffect(() => {
    const map = charts.current;
    return () => {
      Object.values(map).forEach((c) => c.destroy());
    };
  }, []);

  // ── exchange multi-select helpers ────────────────────────────────────────────
  const toggle = (ex: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(ex)) n.delete(ex);
      else n.add(ex);
      return n;
    });
  const only = (ex: string) => setSelected(new Set([ex]));
  const selectAll = () => setSelected(new Set(allExchanges));
  const clearAll = () => setSelected(new Set());

  const buttonLabel = useMemo(() => {
    if (selected.size === 0) return "No exchanges selected";
    if (selected.size === allExchanges.length) return "All Exchanges";
    if (selected.size <= 3) return [...selected].join(", ");
    return `${selected.size} exchanges selected`;
  }, [selected, allExchanges]);

  const visibleOptions = allExchanges.filter((e) => e.toLowerCase().includes(search.toLowerCase()));

  const STATS = [
    { label: "Total Volume", value: stats.total, Icon: TrendingUp },
    { label: "Unique Exchanges", value: stats.exchanges, Icon: Layers },
    { label: "Unique Instances", value: stats.instances, Icon: Server },
    { label: "Avg Daily Volume", value: stats.avg, Icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-ink-800 bg-card p-4">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-ink-500">
          Time Range
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>

        {range === "custom" && (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-ink-500">
              Start
              <input type="date" value={customStart} min={meta?.windowStart} max={meta?.windowEnd} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-ink-500">
              End
              <input type="date" value={customEnd} min={meta?.windowStart} max={meta?.windowEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-foreground" />
            </label>
          </>
        )}

        <div className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-ink-500" id="exchange-multi-select">
          Exchanges
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex min-w-56 items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
            >
              <span className="truncate">{buttonLabel}</span>
              <ChevronDown className={cn("size-4 shrink-0 text-ink-500 transition-transform", dropdownOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {dropdownOpen && (
              <div className="absolute z-20 mt-1 w-72 rounded-lg border border-ink-800 bg-ink-950 p-2 shadow-xl">
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search exchanges…"
                    className="w-full rounded-md border border-ink-800 bg-ink-900 py-1.5 pl-8 pr-2 text-sm font-normal normal-case tracking-normal text-foreground placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {visibleOptions.map((ex) => (
                    <label key={ex} className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-ink-200 hover:bg-ink-900">
                      <input type="checkbox" checked={selected.has(ex)} onChange={() => toggle(ex)} className="accent-brand-teal" />
                      <span className="flex-1 truncate">{ex}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); only(ex); }} className="rounded border border-ink-700 px-1.5 py-0.5 text-[10px] uppercase text-ink-400 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                        Only
                      </button>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex gap-2 border-t border-ink-800 pt-2">
                  <button type="button" onClick={selectAll} className="flex-1 rounded-md border border-ink-800 px-2 py-1 text-xs font-normal normal-case tracking-normal text-ink-300 hover:text-foreground">Select All</button>
                  <button type="button" onClick={clearAll} className="flex-1 rounded-md border border-ink-800 px-2 py-1 text-xs font-normal normal-case tracking-normal text-ink-300 hover:text-foreground">Clear All</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {stats.dateRange && <span className="ml-auto self-center font-mono text-xs text-ink-500">{stats.dateRange}</span>}
      </div>

      {/* stat cards */}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-ink-800 bg-card p-5">
            <dt className="flex items-center gap-2 text-sm text-ink-500">
              <s.Icon className="size-4" aria-hidden="true" />
              {s.label}
            </dt>
            <dd className="mt-2 text-2xl font-bold tabular-nums text-brand-teal sm:text-3xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      {!loaded && <p className="py-12 text-center text-ink-500">Loading reported volumes…</p>}

      <ChartCard title="Daily Volume" hint="Drag to zoom, double-click to reset" innerRef={dailyRef} />
      <ChartCard title="Volume by Exchange" hint="Top 15 by total volume" innerRef={exchangeRef} />
      <ChartCard title="Volume by Version" hint="Top 15 versions — others aggregated" innerRef={versionRef} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Volume by Instance" hint="Treemap of all-time volume share — top 30, remainder aggregated" innerRef={instanceRef} />
        <ChartCard title="Active Instances" hint="Unique instances reporting volume per day" innerRef={activeRef} />
      </div>

      {/* exchange table */}
      <section className="rounded-xl border border-ink-800 bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Exchange Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Exchange</th>
                <th className="py-2 pr-3 text-right font-medium">Total Volume</th>
                <th className="py-2 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {table.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-ink-500">No data for selected filters</td></tr>
              ) : (
                table.map((row, i) => (
                  <tr key={row.exchange} className="border-b border-ink-800/60">
                    <td className="py-2 pr-3 text-ink-500 tabular-nums">{i + 1}</td>
                    <td className="py-2 pr-3 font-medium text-foreground">{row.exchange}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-foreground">{formatVolume(row.volume)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-800">
                          <div className="h-full rounded-full bg-brand-teal" style={{ width: `${row.bar}%` }} />
                        </div>
                        <span className="tabular-nums text-ink-400">{row.share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
