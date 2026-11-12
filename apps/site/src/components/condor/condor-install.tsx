"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyButton, cn } from "@hummingbot/ui";
import { AFTER_INSTALL } from "./condor-steps";

/** One-line installer (redirects to hummingbot/deploy's install-condor.sh). */
export const CONDOR_INSTALL_COMMAND = "curl -fsSL https://hummingbot.org/install-condor.sh | bash";

type Os = "mac" | "linux" | "windows";

// From Condor's README ("What you need"): Mac or Linux; Windows through WSL2.
const OS_TABS: { id: Os; label: string; needs: React.ReactNode[] }[] = [
  {
    id: "mac",
    label: "macOS",
    needs: [
      <>The Terminal app.</>,
      <>
        <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Docker Desktop
        </a>
        , installed and running, if you also install the Hummingbot API on this Mac.
      </>,
    ],
  },
  {
    id: "linux",
    label: "Linux",
    needs: [
      <>A terminal. The installer can add Docker for you if it&apos;s missing.</>,
    ],
  },
  {
    id: "windows",
    label: "Windows",
    needs: [
      <>
        <a href="https://learn.microsoft.com/windows/wsl/install" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          WSL2 with Ubuntu
        </a>
        . Run the command in the Ubuntu terminal, not PowerShell.
      </>,
      <>
        <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Docker Desktop
        </a>{" "}
        with WSL integration, if you also install the Hummingbot API.
      </>,
    ],
  },
];

function detectOs(): Os {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "mac";
  return "linux";
}

/**
 * How to install Condor: OS tabs (detected), what you need, the one-line
 * command and what happens next. `compact` is the version inside the Clone
 * dialog; the full one lives on /get-condor. One component so both stay in sync.
 */
export function CondorInstall({ compact = false }: { compact?: boolean }) {
  const [os, setOs] = useState<Os>("mac");
  useEffect(() => {
    const id = requestAnimationFrame(() => setOs(detectOs()));
    return () => cancelAnimationFrame(id);
  }, []);
  const tab = OS_TABS.find((t) => t.id === os)!;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Your computer" className="inline-flex rounded-lg border border-border bg-card p-1">
        {OS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === os}
            onClick={() => setOs(t.id)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              t.id === os ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">You need</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {tab.needs.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {os === "windows" ? "Paste in the Ubuntu terminal" : "Paste in your terminal"}
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-950 py-2 pl-3 pr-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink-100 md:text-sm">
            <span className="select-none text-ink-500">$ </span>
            {CONDOR_INSTALL_COMMAND}
          </code>
          <CopyButton value={CONDOR_INSTALL_COMMAND} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Run it from an empty folder: it creates a condor/ folder there.</p>
      </div>

      {compact ? (
        <ol className="space-y-2 text-sm text-muted-foreground">
          {AFTER_INSTALL.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="w-5 shrink-0 font-mono text-xs font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="font-medium text-foreground">{/[.”]$/.test(s.title) ? s.title : `${s.title}.`}</span> {s.body}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {compact && (
        <Link href="/get-condor" className="inline-block text-sm font-semibold text-primary hover:underline">
          Full install guide →
        </Link>
      )}
    </div>
  );
}
