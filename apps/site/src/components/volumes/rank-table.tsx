"use client";

import { useState } from "react";
import { capitalize, formatUsd } from "@/lib/volumes-format";

type Row = { name: string; volume: number; share: number };

/** Volume ranking table that shows the first `initial` rows, with a Show
 *  more / Show less toggle for the rest. */
export function RankTable({
  title,
  rows,
  initial = 5,
}: {
  title: string;
  rows: Row[];
  initial?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, initial);
  const hidden = rows.length - initial;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wider text-ink-500">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 text-right font-medium">Volume</th>
            <th className="py-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.name} className="border-b border-ink-900">
              <td className="py-2 font-medium">{capitalize(r.name)}</td>
              <td className="py-2 text-right tabular-nums text-ink-300">{formatUsd(r.volume)}</td>
              <td className="py-2 text-right tabular-nums text-ink-500">
                {(r.share * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-medium text-brand-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </section>
  );
}
