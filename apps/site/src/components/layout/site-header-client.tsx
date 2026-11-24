"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@hummingbot/ui";
import { nav, primaryCta, urls, type NavItem } from "@/config/site";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const isExternal = (href: string) => /^https?:/.test(href);
const externalProps = (href: string) => (isExternal(href) ? { target: "_blank", rel: "noreferrer" } : {});

function matches(pathname: string | null, href: string): boolean {
  if (!pathname || !href.startsWith("/") || href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** A top-level item is active on its own page or any of its children's. */
function isActive(pathname: string | null, item: NavItem): boolean {
  return matches(pathname, item.href) || (item.children ?? []).some((c) => matches(pathname, c.href));
}

/**
 * Closes a popup on Escape (sending focus back to its trigger), on a click
 * or tap outside it, and when keyboard focus moves out of it.
 */
function useDismiss(
  open: boolean,
  setOpen: (v: boolean) => void,
  ref: React.RefObject<HTMLElement | null>,
  trigger: React.RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (e: PointerEvent) => !root?.contains(e.target as Node) && setOpen(false);
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && !root?.contains(next)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    root?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [open, setOpen, ref, trigger]);
}

/**
 * Desktop dropdown. A mouse opens it on hover; a click, tap or Enter/Space
 * toggles it. A click right after the hover opened it keeps it open, and
 * touch never goes through hover, so one tap always opens it. Closes on
 * Escape, outside click or focus leaving.
 */
function NavDropdown({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedAt = useRef(0);
  const menuId = useId();
  useDismiss(open, setOpen, ref, trigger);

  const enter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!open) hoverOpenedAt.current = Date.now();
    setOpen(true);
  };
  const leave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  const toggle = () => {
    if (open && Date.now() - hoverOpenedAt.current < 600) return;
    setOpen(!open);
  };

  return (
    <div ref={ref} className="relative" onPointerEnter={enter} onPointerLeave={leave}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-current={active ? "true" : undefined}
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap text-base font-medium text-foreground transition-colors hover:text-primary",
          active && "underline decoration-primary decoration-2 underline-offset-8",
        )}
      >
        {item.label}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} className="absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-3">
          <ul className="overflow-hidden rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
            {item.children!.map((child) => (
              <li key={child.label}>
                <Link
                  href={child.href}
                  {...externalProps(child.href)}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    {child.label}
                    {isExternal(child.href) && <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />}
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

/** A mobile-menu section (Docs, Hub, About): collapsed until tapped. */
function MobileSection({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-base font-medium text-foreground hover:bg-card hover:text-primary",
          active && "text-primary",
        )}
      >
        {item.label}
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      <ul id={listId} hidden={!expanded} className="mb-2 ml-3 border-l border-border pl-3">
        {item.children!.map((c) => (
          <li key={c.label}>
            <Link
              href={c.href}
              {...externalProps(c.href)}
              onClick={onNavigate}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-primary"
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Links that leave the site (Botcamp's education, XRPL rewards), quieter than the nav. */
const SIDE_LINKS = [
  { label: "Education", href: urls.education },
  { label: "Rewards", href: urls.rewards },
] as const;

/**
 * The header in the unified site's design: a sticky frosted bar with the
 * logo, a right-aligned nav with dropdowns, then the external links, the
 * GitHub repo with its stars, the theme toggle and the primary button.
 */
export function SiteHeaderClient({ githubWidget }: { githubWidget?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useDismiss(open, setOpen, headerRef, menuButton);

  // While the mobile menu is open the page behind it doesn't scroll.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-3 focus-visible:z-[60] focus-visible:rounded-md focus-visible:bg-foreground focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-background"
      >
        Skip to content
      </a>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md"
      >
        <div className="flex h-16 items-center px-4 sm:px-6 xl:px-8">
          <Logo />

          {/* The full nav needs about 1200px next to the logo and the right
              side; below that it lives in the menu button. */}
          <nav
            className="ml-8 mr-5 hidden gap-7 xl:flex xl:flex-1 xl:items-center xl:justify-end 2xl:gap-8"
            aria-label="Primary"
          >
            {nav.map((item) =>
              item.children?.length ? (
                <NavDropdown key={item.label} item={item} active={isActive(pathname, item)} />
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  {...externalProps(item.href)}
                  aria-current={isActive(pathname, item) ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap text-base font-medium text-foreground transition-colors hover:text-primary",
                    isActive(pathname, item) && "underline decoration-primary decoration-2 underline-offset-8",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span aria-hidden="true" className="mr-1 hidden h-6 w-px bg-border xl:block" />
            {SIDE_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1 whitespace-nowrap px-2 text-sm text-muted-foreground hover:text-foreground 2xl:inline-flex"
              >
                {label} <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />
              </a>
            ))}
            {githubWidget && <span className="hidden px-2 sm:inline-flex">{githubWidget}</span>}
            <ThemeToggle />
            <Link
              href={primaryCta.href}
              className="hidden h-9 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 sm:inline-flex"
            >
              {primaryCta.label}
            </Link>
            <button
              ref={menuButton}
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(!open)}
              className="inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-card xl:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav
            id="mobile-menu"
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-background px-4 py-4 sm:px-6 xl:hidden"
            aria-label="Mobile"
          >
            <ul className="flex flex-col gap-1">
              {nav.map((item) =>
                item.children?.length ? (
                  <MobileSection
                    key={item.label}
                    item={item}
                    active={isActive(pathname, item)}
                    onNavigate={() => setOpen(false)}
                  />
                ) : (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      {...externalProps(item.href)}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(pathname, item) ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-card hover:text-primary",
                        isActive(pathname, item) && "text-primary",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
              {SIDE_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-card hover:text-primary"
                  >
                    {label} <ArrowUpRight className="size-4 opacity-60" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            <Link
              href={primaryCta.href}
              onClick={() => setOpen(false)}
              className="mt-4 flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground sm:hidden"
            >
              {primaryCta.label}
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
