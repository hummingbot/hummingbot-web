"use client";

import { Github, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@hummingbot/ui";

function HubLogo() {
  return (
    <Link
      href="/"
      aria-label="Hummingbot Hub"
      className="inline-flex items-center gap-2 font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      <svg viewBox="0 0 24 24" className="size-6 text-brand-teal" fill="currentColor" aria-hidden="true">
        <path d="M12 2c2.2 3.1 5.3 4.4 8.5 4.8-.6 4.7-3 7.8-6 9.4l2 5.8-4.5-3.2L7.5 22l2-5.8c-3-1.6-5.4-4.7-6-9.4C6.7 6.4 9.8 5.1 12 2z" />
      </svg>
      <span className="text-lg">
        Hummingbot <span className="text-ink-500">Hub</span>
      </span>
    </Link>
  );
}

const navItems = [
  { label: "Strategies", href: "/strategies" },
  { label: "Routines", href: "/routines" },
  { label: "Agents", href: "/agents" },
  { label: "Publishers", href: "/publishers" },
  { label: "Dashboard", href: "/dashboard" },
];

const externalItems = [
  { label: "Docs", href: "https://docs.hummingbot.org" },
  { label: "Discord", href: "https://discord.gg/hummingbot" },
  { label: "hummingbot.org", href: "https://hummingbot.org" },
];

export function HubHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-999/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <HubLogo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="rounded-md px-3 py-2 text-sm text-ink-300 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://hummingbot.org"
            className="hidden rounded-md px-3 py-2 text-sm text-ink-400 hover:text-foreground sm:inline-block md:hidden lg:inline-block"
          >
            hummingbot.org
          </a>
          <a
            href="https://github.com/hummingbot"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="inline-flex size-9 items-center justify-center rounded-md text-ink-300 hover:bg-ink-900 hover:text-foreground"
          >
            <Github className="size-5" aria-hidden="true" />
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-md text-ink-300 hover:bg-ink-900 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-ink-800 bg-ink-999 px-4 py-4 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-1">
            {navItems.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className="flex rounded-md px-3 py-2.5 text-base text-ink-200 hover:bg-ink-900"
                >
                  {i.label}
                </Link>
              </li>
            ))}
            {externalItems.map((i) => (
              <li key={i.href}>
                <a
                  href={i.href}
                  {...(i.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                  className="flex rounded-md px-3 py-2.5 text-base text-ink-200 hover:bg-ink-900"
                >
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export function HubFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-ink-800 bg-ink-999", className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-xs text-ink-600 sm:flex-row">
        <p>© {new Date().getFullYear()} Hummingbot Foundation · Built by the community.</p>
        <div className="flex gap-4">
          <a href="https://docs.hummingbot.org" className="hover:text-foreground">Docs</a>
          <a href="https://discord.gg/hummingbot" className="hover:text-foreground">Discord</a>
          <a href="https://github.com/hummingbot" className="hover:text-foreground">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
