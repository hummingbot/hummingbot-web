"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Shield, User, X } from "lucide-react";
import { cn } from "@hummingbot/ui";
import { nav, primaryCta, urls, type NavItem } from "@/config/site";
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

function matches(pathname: string | null, href: string): boolean {
  if (!pathname || !href.startsWith("/") || href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** A top-level item is active on its own page or any of its children's. */
function isActive(pathname: string | null, item: NavItem): boolean {
  return matches(pathname, item.href) || (item.children ?? []).some((c) => matches(pathname, c.href));
}

/** The signed-in user, when there is one (today: the dashboard preview user). */
export type HeaderAccount = { name: string | null; image: string | null; isAdmin?: boolean };

function initials(name: string | null) {
  return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

function Avatar({ account, className }: { account: HeaderAccount; className?: string }) {
  const [broken, setBroken] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An image that failed before hydration never fires onError: check on mount.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setBroken(true);
  }, []);
  return account.image && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote avatars from Botcamp
    <img ref={img} src={account.image} alt="" onError={() => setBroken(true)} className={cn("rounded-full object-cover", className)} />
  ) : (
    <span className={cn("inline-flex items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary", className)}>
      {initials(account.name)}
    </span>
  );
}

const ACCOUNT_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  // Botcamp merged settings into the profile page (/dashboard/settings redirects there).
  { label: "Profile & settings", href: "/dashboard/profile", icon: User },
] as const;

/** Avatar menu: the account's pages (profile, settings) live here, not in the dashboard sidebar. */
function AccountMenu({ account }: { account: HeaderAccount }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full p-0.5 ring-offset-background transition hover:ring-2 hover:ring-primary/40"
      >
        <Avatar account={account} className="size-8" />
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar account={account} className="size-9" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{account.name ?? "Your account"}</span>
              <span className="block text-xs text-muted-foreground">Read-only preview</span>
            </span>
          </div>
          <div className="my-1 border-t border-border" />
          {[...ACCOUNT_LINKS, ...(account.isAdmin ? [{ label: "Admin", href: "/admin", icon: Shield }] : [])].map(
            ({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {label}
              </Link>
            ),
          )}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            disabled
            title="Read-only preview"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Desktop dropdown: opens on hover or click, closes on Escape / outside click. */
function NavDropdown({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 text-base font-medium text-foreground transition-colors hover:text-primary",
          active && "underline decoration-primary decoration-2 underline-offset-8",
        )}
      >
        {item.label}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-3">
          <ul className="overflow-hidden rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
            {item.children!.map((child) => (
              <li key={child.label}>
                <Link
                  href={child.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted",
                    !child.description && "mt-1 border-t border-border pt-3 text-sm font-semibold text-primary",
                  )}
                >
                  <span className={cn("block", child.description && "text-sm font-semibold text-foreground")}>
                    {child.label}
                    {!child.description && " →"}
                  </span>
                  {child.description && (
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{child.description}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Botcamp-style header: a sticky frosted bar with the logo, a right-aligned
 * nav (dropdowns for Products, Learn and Community), theme toggle, Sign in and
 * the primary call to action.
 */
export function SiteHeaderClient({ account }: { account?: HeaderAccount } = {}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const subBrand = subBrandFor(pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center px-6 lg:px-8">
        <Logo product={subBrand?.label} />

        <nav className="mr-6 hidden gap-6 lg:flex lg:flex-1 lg:items-center lg:justify-end xl:gap-8" aria-label="Primary">
          {nav.map((item) =>
            item.children?.length ? (
              <NavDropdown key={item.label} item={item} active={isActive(pathname, item)} />
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "text-base font-medium text-foreground transition-colors hover:text-primary",
                  isActive(pathname, item) && "underline decoration-primary decoration-2 underline-offset-8",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!account && (
            <Link
              href={urls.signup}
              className="hidden h-9 items-center px-3 text-sm font-medium text-foreground hover:text-primary lg:inline-flex"
            >
              Sign in
            </Link>
          )}
          <Link
            href={primaryCta.href}
            className="hidden h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 lg:inline-flex"
          >
            {primaryCta.label}
          </Link>
          {account && <AccountMenu account={account} />}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-card lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-6 py-4 lg:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-card hover:text-primary",
                    isActive(pathname, item) && "text-primary",
                  )}
                >
                  {item.label}
                </Link>
                {item.children?.length ? (
                  <ul className="mb-2 ml-3 border-l border-border pl-3">
                    {item.children
                      .filter((c) => c.description)
                      .map((c) => (
                        <li key={c.label}>
                          <Link
                            href={c.href}
                            onClick={() => setOpen(false)}
                            className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-primary"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          {account && (
            <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
              {ACCOUNT_LINKS.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-card"
                  >
                    <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href={account ? "/dashboard" : urls.signup}
              onClick={() => setOpen(false)}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-input text-sm font-medium"
            >
              {account ? (
                <>
                  <Avatar account={account} className="size-5" /> Dashboard
                </>
              ) : (
                "Sign in"
              )}
            </Link>
            <Link
              href={primaryCta.href}
              onClick={() => setOpen(false)}
              className="flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              {primaryCta.label}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
