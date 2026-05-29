"use client";

import { ArrowRight, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { announcement } from "@/config/site";

const KEY = "hb-announce:condor";

// Read the dismissed flag from localStorage via useSyncExternalStore so the
// client-only state never triggers a hydration mismatch or a setState-in-effect.
// SSR + first paint render hidden (server snapshot = true), then reveal after
// hydration if the user hasn't dismissed it.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function dismiss() {
  localStorage.setItem(KEY, "1");
  listeners.forEach((l) => l());
}

const getSnapshot = () => localStorage.getItem(KEY) === "1";
const getServerSnapshot = () => true;

export function AnnouncementBar() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative border-b border-ink-800 bg-ink-950"
    >
      <a
        href={announcement.href}
        className="group flex items-center justify-center gap-2 px-10 py-2 text-center text-sm text-ink-300 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-pretty">{announcement.text}</span>
        <ArrowRight
          className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </a>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-md text-ink-500 hover:bg-ink-800 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
