"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@hummingbot/ui";
import { nav, urls } from "@/config/site";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/** Main products whose name joins the wordmark while you're in them. */
const SUB_BRANDS = [
  { label: "Botcamp", href: "/botcamp" },
  { label: "Condor", href: "/docs/condor" },
] as const;

function subBrandFor(pathname: string | null) {
  return SUB_BRANDS.find((b) => pathname === b.href || pathname?.startsWith(b.href + "/")) ?? null;
}

function isActive(pathname: string | null, href: string): boolean {
  // Hash links (e.g. /botcamp#hackathons) point into another nav item's page.
  if (!pathname || !href.startsWith("/") || href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/**
 * Botcamp-style header: a sticky frosted bar with the logo, a flat
 * right-aligned nav (active link underlined in primary), theme toggle, and
 * the primary account button.
 */
export function SiteHeaderClient() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const subBrand = subBrandFor(pathname);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex h-16 items-center px-6 lg:px-8">
          <Logo product={subBrand?.label} />

          <nav className="mr-6 hidden gap-6 md:flex md:flex-1 md:items-center md:justify-end lg:gap-8" aria-label="Primary">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "text-base font-medium text-foreground transition-colors hover:text-primary",
                  isActive(pathname, item.href) && "underline decoration-primary decoration-2 underline-offset-8",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href={urls.signup}
              className="hidden h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 md:inline-flex"
            >
              Sign Up
            </Link>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-card md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-border bg-background px-6 py-4 md:hidden" aria-label="Mobile">
            <ul className="flex flex-col gap-1">
              {nav.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-card hover:text-primary",
                      isActive(pathname, item.href) && "text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={urls.signup}
              onClick={() => setOpen(false)}
              className="mt-4 flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Sign Up
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
