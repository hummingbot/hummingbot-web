"use client";

import { useState } from "react";
import { CopyButton, cn } from "@hummingbot/ui";
import { Code2, Smartphone } from "lucide-react";

const ICONS = { phone: Smartphone, code: Code2 } as const;

export type InstallTab = {
  id: string;
  label: string;
  /** Base command (latest channel). The Dev toggle appends ` -s -- --dev`. */
  command: string;
  /** Dimmed comment line shown above the command. */
  comment?: string;
  /** Show the Latest/Dev channel toggle (Hummingbot only — Condor always tracks main). */
  channels?: boolean;
  /** Heading for the description section inside the install card. */
  title?: string;
  /** One- to two-sentence product description, shown inside the install card. */
  description?: string;
  /** Icon shown next to the description. */
  icon?: keyof typeof ICONS;
};

export function InstallTabs({ tabs }: { tabs: InstallTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const [dev, setDev] = useState(false);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!current) return null;

  const showChannel = current.channels ?? false;
  const command =
    showChannel && dev ? `${current.command} -s -- --dev` : current.command;
  const Icon = current.icon ? ICONS[current.icon] : null;

  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-ink-800 bg-ink-950 text-left shadow-2xl shadow-black/40">
      {/* chrome row: traffic lights · product tabs · OS · channel */}
      <div className="flex items-center gap-3 border-b border-ink-800/70 px-4 py-3">
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>

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
                "rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                t.id === active
                  ? "bg-brand-teal text-ink-950"
                  : "text-ink-500 hover:text-ink-300",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden select-none font-mono text-xs text-ink-600 md:inline">
            macOS · Linux
          </span>
          {showChannel && (
            <button
              type="button"
              onClick={() => setDev((v) => !v)}
              aria-pressed={dev}
              aria-label={`Channel: ${dev ? "Dev" : "Latest"}`}
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                dev
                  ? "border-brand-teal/60 bg-brand-teal/10 text-brand-teal"
                  : "border-ink-800 text-ink-500 hover:text-ink-300",
              )}
            >
              {dev ? "Dev" : "Latest"}
            </button>
          )}
        </div>
      </div>

      {/* body: comment · prompt · command · copy */}
      <div
        role="tabpanel"
        id={`panel-${current.id}`}
        aria-labelledby={`tab-${current.id}`}
        className="px-4 py-4 font-mono text-sm"
      >
        {current.comment && (
          <p className="mb-2 select-none text-ink-600">{current.comment}</p>
        )}
        <div className="flex items-center gap-3">
          <span className="select-none text-ink-500" aria-hidden="true">
            $
          </span>
          <code
            className="flex-1 overflow-x-auto whitespace-nowrap text-foreground"
            translate="no"
          >
            {command}
          </code>
          <CopyButton
            value={command}
            label="Copy command"
            className="-mr-1 shrink-0"
          />
        </div>
      </div>
      {(current.title || current.description) && (
        <div className="flex items-start gap-4 border-t border-ink-800/70 px-4 py-5 sm:px-6">
          {Icon && (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-brand-teal/20 bg-brand-teal/10 text-brand-teal">
              <Icon className="size-5" aria-hidden="true" />
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
              {current.label}
            </p>
            {current.title && (
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                {current.title}
              </h3>
            )}
            {current.description && (
              <p className="mt-2 text-sm leading-relaxed text-ink-400 sm:text-base">
                {current.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
