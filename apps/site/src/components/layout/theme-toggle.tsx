"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Light/dark switch. The theme is set pre-paint on <html data-theme> by the
 * inline script in layout.tsx; this flips that attribute and persists the
 * choice. The icon follows the attribute through CSS, so SSR and the client
 * agree without tracking the theme in state.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("site-theme", next);
    } catch {
      // localStorage unavailable (private mode) — the in-memory toggle still works.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark mode"
      className="inline-flex size-9 items-center justify-center rounded-md text-ink-300 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Sun className="size-5 [[data-theme=light]_&]:hidden" aria-hidden="true" />
      <Moon className="hidden size-5 [[data-theme=light]_&]:block" aria-hidden="true" />
    </button>
  );
}
