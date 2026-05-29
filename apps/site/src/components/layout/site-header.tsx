"use client";

import { ArrowUpRight, ChevronDown, Github, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, cn } from "@hummingbot/ui";
import { nav, urls, type NavItem } from "@/config/site";
import { Logo } from "./logo";

function NavLink({ item }: { item: NavItem }) {
  const hasChildren = !!item.children?.length;
  const base =
    "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-ink-300 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
        className={base}
      >
        {item.label}
        {item.external && <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />}
      </Link>
    );
  }

  return (
    <div className="group relative">
      <button type="button" className={base} aria-haspopup="true">
        {item.label}
        <ChevronDown className="size-3.5 opacity-60 transition-transform group-hover:rotate-180" aria-hidden="true" />
      </button>
      <div className="invisible absolute left-0 top-full z-50 min-w-56 translate-y-1 rounded-xl border border-ink-800 bg-ink-950 p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {item.children!.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            {...(/^https?:/.test(c.href) ? { target: "_blank", rel: "noreferrer" } : {})}
            className="block rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-ink-900 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-medium text-foreground">{c.label}</span>
            {c.description && (
              <span className="block text-xs text-ink-500">{c.description}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-999/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {nav.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href={urls.education}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm text-ink-400 hover:text-foreground"
          >
            Education <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />
          </a>
          <a
            href={urls.github}
            target="_blank"
            rel="noreferrer"
            aria-label="Hummingbot on GitHub"
            className="inline-flex size-9 items-center justify-center rounded-md text-ink-300 hover:bg-ink-900 hover:text-foreground"
          >
            <Github className="size-5" aria-hidden="true" />
          </a>
          <a href={urls.docs} target="_blank" rel="noreferrer">
            <Button size="sm">Get Started</Button>
          </a>
        </div>

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

      {open && (
        <nav
          className="border-t border-ink-800 bg-ink-999 px-4 py-4 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-1">
            {nav.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-2.5 text-base text-ink-200 hover:bg-ink-900",
                  )}
                >
                  {item.label}
                  {item.external && <ArrowUpRight className="size-4 opacity-60" aria-hidden="true" />}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <a href={urls.docs} className="flex-1">
              <Button size="md" className="w-full">
                Get Started
              </Button>
            </a>
            <a href={urls.github} target="_blank" rel="noreferrer" className="flex-1">
              <Button size="md" variant="outline" className="w-full">
                GitHub
              </Button>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
