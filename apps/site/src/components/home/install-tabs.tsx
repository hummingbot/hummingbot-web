"use client";

import { useState } from "react";
import { CodeBlock, cn } from "@hummingbot/ui";

export type InstallTab = {
  id: string;
  label: string;
  command: string;
  version: string | null;
};

export function InstallTabs({ tabs }: { tabs: InstallTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div className="w-full max-w-xl">
      <div role="tablist" aria-label="Install command" className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              t.id === active
                ? "bg-ink-950 text-foreground"
                : "text-ink-500 hover:text-ink-300",
            )}
          >
            {t.label}
            {t.version && (
              <span className="ml-2 font-mono text-xs text-ink-600">{t.version}</span>
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${current.id}`}
        aria-labelledby={`tab-${current.id}`}
        className="rounded-b-lg rounded-tr-lg"
      >
        <CodeBlock command={current.command} />
      </div>
    </div>
  );
}
