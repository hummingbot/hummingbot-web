'use client'

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Check, ChevronsUpDown, GraduationCap, Handshake, PanelLeft, Bell, Shield, User, X, type LucideIcon } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { SITE_NAME } from "@/botcamp/lib/site"
import { adminNavItems, dashboardNavItems, teachingNavItems, teamNavItems, type DashboardNavItem } from "./dashboard-nav"

export interface NextHackathonEvent {
  title: string
  date: string
  /** YouTube (or other) link — the page hosting the real Notify Me button. */
  url: string | null
}

export interface DashboardTeam {
  slug: string
  name: string
}

interface DashboardSidebarProps {
  /** When provided, renders the lesson-player PanelLeft collapse toggle. */
  onToggle?: () => void
  /** Called after a nav link is clicked (mobile drawer auto-close). */
  onNavigate?: () => void
  /** Active hackathon title — relabels the hackathon nav item. */
  hackathonName?: string | null
  /** Next hackathon session — promoted in a card at the sidebar bottom. */
  nextEvent?: NextHackathonEvent | null
  /** Sponsor team the current user belongs to, if any — a context in the switcher. */
  team?: DashboardTeam | null
  /** The user's role, read from the database by the layout: ADMIN and INSTRUCTOR get the admin context. */
  role?: string | null
}

export type DashboardContext = "me" | "team" | "admin"

function linkClass(isActive: boolean, highlighted = false) {
  return cn(
    "flex items-center gap-3 rounded-bc-lg px-3 py-2 text-base font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : highlighted
        ? "bg-primary/10 text-primary hover:bg-primary/15"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  )
}

export function DashboardSidebar({
  onToggle,
  onNavigate,
  hackathonName,
  nextEvent,
  team,
  role,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdmin = role === "ADMIN"
  const isInstructor = role === "INSTRUCTOR"
  // Session-only dismiss — resets on a full refresh, persists across in-app nav.
  const [eventDismissed, setEventDismissed] = useState(false)

  // Each context is its own area — personal, the sponsor team, admin — and the
  // sidebar shows that area's sections. Only people with a second context (a
  // team member, an admin or instructor) see the switcher.
  const inAdmin = (isAdmin || isInstructor) && !!pathname && (pathname === "/admin" || pathname.startsWith("/admin/"))
  const inTeam = !inAdmin && !!team && !!pathname?.startsWith("/dashboard/team")
  const context: DashboardContext = inAdmin ? "admin" : inTeam ? "team" : "me"
  const items = inAdmin ? (isAdmin ? adminNavItems : teachingNavItems) : inTeam ? teamNavItems : dashboardNavItems
  const hasSwitcher = !!team || isAdmin || isInstructor

  const isActive = (item: DashboardNavItem) => {
    if (!pathname) return false
    const [path, query] = item.href.split("?")
    if (query) {
      // Team tabs: /dashboard/team?tab=x (no tab = the first one).
      const tab = new URLSearchParams(query).get("tab")
      const current = searchParams?.get("tab") ?? "edit"
      if (item.match?.some((m) => pathname.startsWith(m))) return true
      return pathname === path && current === tab
    }
    if (path === "/dashboard" || path === "/admin") return pathname === path
    return [path, ...(item.match ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`))
  }

  // The hackathon promo card still uses the hackathon data.
  void hackathonName

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* Site title + collapse toggle — fills the top-left when expanded. */}
      {onToggle && (
        <div className="flex h-16 items-center justify-between gap-2 pl-4 pr-2">
          <span className="truncate text-base font-bold tracking-bc-tight">{SITE_NAME}</span>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bc-md hover:bg-card transition-colors text-foreground"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {hasSwitcher && (
        <div className={cn("px-3 pb-3", !onToggle && "pt-4")}>
          <ContextSwitcher team={team ?? null} role={role ?? null} context={context} onNavigate={onNavigate} />
        </div>
      )}

      <nav className={cn("grid gap-1 px-3 pb-4", !onToggle && !hasSwitcher && "pt-4")}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={linkClass(isActive(item))}
          >
            <item.icon className="h-5 w-5" />
            {item.title}
          </Link>
        ))}

      </nav>

      {/* Next hackathon event — promo card pinned to the sidebar bottom. */}
      {nextEvent && !eventDismissed && (
        <div className="mt-auto p-3">
          <div className="relative rounded-bc-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-4">
            <button
              type="button"
              onClick={() => setEventDismissed(true)}
              aria-label="Dismiss"
              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-bc-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="mb-1 pr-6 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-500">
              Next event ·{" "}
              {new Date(nextEvent.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <p className="mb-3 text-sm font-semibold leading-tight">{nextEvent.title}</p>
            {nextEvent.url ? (
              <a
                href={nextEvent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-bc-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Bell className="h-4 w-4" />
                Notify Me
              </a>
            ) : (
              <Link
                href="/dashboard/hackathons"
                onClick={onNavigate}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-bc-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                View Hub
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * "Your account ▾ / {team} / Admin" — switches the sidebar between the personal
 * area, the sponsor team's admin and the site admin, like Vercel's team or
 * Hugging Face's org switcher. Rendered only for people with a second context.
 */
function ContextSwitcher({
  team,
  role,
  context,
  onNavigate,
}: {
  team: DashboardTeam | null
  role: string | null
  context: DashboardContext
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onClick)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onClick)
    }
  }, [open])

  const options: { key: DashboardContext; kicker: string; label: string; hint: string; href: string; icon: LucideIcon }[] = [
    { key: "me", kicker: "Personal", label: "Your account", hint: "Learning, strategies, hackathons", href: "/dashboard", icon: User },
    ...(team
      ? [{ key: "team" as const, kicker: "Team", label: team.name, hint: "Sponsor team admin", href: "/dashboard/team", icon: Handshake }]
      : []),
    ...(role === "ADMIN"
      ? [{ key: "admin" as const, kicker: "Admin", label: "Admin", hint: "Users, courses, hackathons, agents", href: "/admin", icon: Shield }]
      : role === "INSTRUCTOR"
        ? [{ key: "admin" as const, kicker: "Teaching", label: "Teaching", hint: "Course editor", href: "/admin/courses", icon: GraduationCap }]
        : []),
  ]
  const current = options.find((o) => o.key === context) ?? options[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-bc-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-accent"
      >
        <current.icon className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {current.kicker}
          </span>
          <span className="block truncate text-sm font-semibold">{current.label}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-bc-lg border border-border bg-popover p-1 shadow-xl"
        >
          {options.map((o) => (
            <li key={o.key} role="option" aria-selected={o.key === current.key}>
              <Link
                href={o.href}
                onClick={() => {
                  setOpen(false)
                  onNavigate?.()
                }}
                className="flex items-center gap-3 rounded-bc-md px-3 py-2 transition-colors hover:bg-accent"
              >
                <o.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{o.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{o.hint}</span>
                </span>
                {o.key === current.key && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
