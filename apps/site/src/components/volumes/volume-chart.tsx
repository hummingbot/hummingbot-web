"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@hummingbot/ui";
import type { DailyPoint } from "@/lib/volumes";

const RANGES = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
  { label: "All", days: Infinity },
] as const;

const usdShort = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : `$${(n / 1e3).toFixed(0)}K`;

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));

export function VolumeChart({ daily }: { daily: DailyPoint[] }) {
  const [days, setDays] = useState<number>(90);
  const data = days === Infinity ? daily : daily.slice(-days);

  return (
    <div>
      <div className="mb-4 flex justify-end gap-1" role="group" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setDays(r.days)}
            aria-pressed={days === r.days}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              days === r.days ? "bg-ink-800 text-foreground" : "text-ink-500 hover:text-ink-300",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5FFFD7" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#5FFFD7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fill: "#71717a", fontSize: 11 }}
              minTickGap={40}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={usdShort}
              tick={{ fill: "#71717a", fontSize: 11 }}
              width={48}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              separator=": "
              contentStyle={{
                background: "#0f0f0f",
                border: "1px solid #2f2f2f",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#a1a1aa" }}
              labelFormatter={(l) => fmtDate(String(l))}
              formatter={(v: number) => [usdShort(v), "Volume"]}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#5FFFD7"
              strokeWidth={2}
              fill="url(#vol)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
