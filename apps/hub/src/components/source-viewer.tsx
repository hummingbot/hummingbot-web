"use client";

import { useState } from "react";
import { CopyButton } from "@hummingbot/ui";
import type { LoadedSource } from "@/lib/sources";

/** Tabbed read-only source browser. Plain monospace — no client-side
 *  highlighter dependency — with per-file copy and line count. */
export function SourceViewer({ files }: { files: LoadedSource[] }) {
  const [active, setActive] = useState(0);
  const file = files[active];
  if (!file) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-ink-800 bg-ink-950">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-ink-800 bg-ink-900/60 px-2">
        {files.map((f, i) => (
          <button
            key={f.name}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={
              "shrink-0 border-b-2 px-3 py-2 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (i === active
                ? "border-brand-teal text-foreground"
                : "border-transparent text-ink-500 hover:text-ink-300")
            }
            translate="no"
          >
            {f.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-1">
          <span className="hidden text-xs text-ink-600 sm:inline">{file.lines} lines</span>
          <CopyButton value={file.code} label="Copy source" className="size-7" />
        </div>
      </div>
      <pre className="max-h-[28rem] overflow-auto p-4 text-xs leading-relaxed">
        <code className="font-mono text-ink-300" translate="no">
          {file.code}
        </code>
      </pre>
    </div>
  );
}
