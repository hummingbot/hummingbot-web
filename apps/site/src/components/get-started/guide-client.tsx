"use client";

import { createContext, useContext, useEffect, useId, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@hummingbot/ui";
import { OS_LABEL, PATHS, SITE_URL, type GuideOs, type GuidePath } from "@/lib/get-started";

type GuideState = { path: GuidePath; os: GuideOs; setPath: (p: GuidePath) => void; setOs: (o: GuideOs) => void };

const GuideContext = createContext<GuideState>({ path: "condor", os: "mac", setPath: () => {}, setOs: () => {} });

const PATH_KEY = "hb-guide-path";

function detectOs(): GuideOs {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "mac";
  return "linux";
}

/**
 * Holds which path (Condor or Client) and OS the reader picked. The server
 * renders every path and OS (non-selected ones with `hidden`), so the full
 * guide is in the HTML for AI assistants and search; this only toggles.
 * ?path=client in the URL wins, then the last choice, then Condor.
 */
export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [path, setPathState] = useState<GuidePath>("condor");
  const [os, setOs] = useState<GuideOs>("mac");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const fromUrl = new URLSearchParams(window.location.search).get("path");
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(PATH_KEY);
      } catch {}
      const p = fromUrl ?? stored;
      if (p === "condor" || p === "client") setPathState(p);
      setOs(detectOs());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const setPath = (p: GuidePath) => {
    setPathState(p);
    try {
      localStorage.setItem(PATH_KEY, p);
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("path", p);
    window.history.replaceState(null, "", url);
  };

  return <GuideContext.Provider value={{ path, os, setPath, setOs }}>{children}</GuideContext.Provider>;
}

export function useGuide() {
  return useContext(GuideContext);
}

/** Content for one path only. Always rendered, hidden when not selected. */
export function ForPath({ path, children }: { path: GuidePath; children: React.ReactNode }) {
  const { path: current } = useGuide();
  return (
    <div hidden={current !== path} data-path={path}>
      {children}
    </div>
  );
}

/**
 * Roving focus for a radio group or tab list: only the selected item is in
 * the tab order (tabIndex 0); the arrow keys, Home and End select the next,
 * previous, first or last item and move focus to it.
 */
function onRovingKeyDown<T extends string>(
  event: React.KeyboardEvent<HTMLElement>,
  items: T[],
  current: T,
  select: (item: T) => void,
  role: "radio" | "tab",
) {
  const i = items.indexOf(current);
  const n = items.length;
  let next: number;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      next = (i + 1) % n;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      next = (i - 1 + n) % n;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = n - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  select(items[next]);
  const siblings = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(`:scope > [role="${role}"]`);
  siblings?.[next]?.focus();
}

/** The two path cards at the top: they are the switch for the whole guide. */
export function PathChooser() {
  const { path, setPath } = useGuide();
  const paths = Object.keys(PATHS) as GuidePath[];
  return (
    <div role="radiogroup" aria-label="How you'll use Hummingbot" className="grid gap-4 md:grid-cols-2">
      {paths.map((p) => {
        const info = PATHS[p];
        const active = p === path;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setPath(p)}
            onKeyDown={(e) => onRovingKeyDown(e, paths, path, setPath, "radio")}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xl font-bold tracking-tight">{info.name}</span>
              {p === "condor" && (
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  Recommended
                </span>
              )}
            </span>
            <span className="mt-1 text-sm font-medium text-foreground/80">{info.tagline}</span>
            <span className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{info.pick}</span>
            <span className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{info.time}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {active && <Check className="size-3" aria-hidden="true" />}
                </span>
                {active ? "Showing this guide" : "Show this guide"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Small reminder of the chosen path, in the sticky table of contents. */
export function PathBadge() {
  const { path, setPath } = useGuide();
  const other: GuidePath = path === "condor" ? "client" : "condor";
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
      <span className="text-muted-foreground">Guide for </span>
      <span className="font-semibold">{PATHS[path].name}</span>
      <button type="button" onClick={() => setPath(other)} className="mt-1 block text-primary hover:underline">
        Switch to {PATHS[other].name}
      </button>
    </div>
  );
}

/** OS tabs. Every OS panel is in the HTML; the tabs only toggle `hidden`. */
export function OsTabs({ panels }: { panels: Record<GuideOs, React.ReactNode> }) {
  const { os, setOs } = useGuide();
  // The guide repeats these tabs per step, so ids are per instance.
  const base = useId();
  const oses = Object.keys(OS_LABEL) as GuideOs[];
  return (
    <div className="rounded-xl border border-border">
      <div role="tablist" aria-label="Your computer" className="flex gap-1 border-b border-border p-1.5">
        {oses.map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            id={`${base}-tab-${o}`}
            aria-controls={`${base}-panel-${o}`}
            aria-selected={o === os}
            tabIndex={o === os ? 0 : -1}
            onClick={() => setOs(o)}
            onKeyDown={(e) => onRovingKeyDown(e, oses, os, setOs, "tab")}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              o === os ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {OS_LABEL[o]}
          </button>
        ))}
      </div>
      {oses.map((o) => (
        <div
          key={o}
          id={`${base}-panel-${o}`}
          role="tabpanel"
          hidden={o !== os}
          aria-labelledby={`${base}-tab-${o}`}
          className="space-y-3 p-4"
        >
          {panels[o]}
        </div>
      ))}
    </div>
  );
}

const AI_PROMPT = `Read ${SITE_URL}/get-started.md and help me install and run Hummingbot step by step. Ask me which option and operating system I use, explain each command before I run it, and never ask for my API keys or passwords.`;

/** "Using an AI assistant?": copy the guide as Markdown, or open it in ChatGPT/Claude. */
export function AskAi() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      const res = await fetch("/get-started.md");
      await navigator.clipboard.writeText(await res.text());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const q = encodeURIComponent(AI_PROMPT);
  const linkCls =
    "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} className={linkCls}>
        {copied ? <Check className="size-4 text-primary" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy guide for AI"}
      </button>
      <a href={`https://chatgpt.com/?q=${q}`} target="_blank" rel="noreferrer" className={linkCls}>
        Open in ChatGPT <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
      <a href={`https://claude.ai/new?q=${q}`} target="_blank" rel="noreferrer" className={linkCls}>
        Open in Claude <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
