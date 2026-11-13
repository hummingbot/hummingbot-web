'use client'

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useSession } from "@/botcamp/lib/preview-session-client"
import { Check, ChevronsUpDown, GraduationCap, Handshake, PanelLeft, Bell, User, X } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { SITE_NAME } from "@/botcamp/lib/site"
import { dashboardNavItems, teamNavItems, type DashboardNavItem } from "./dashboard-nav"

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
  /** Sponsor team the current user belongs to, if any — shows the context switcher. */
  team?: DashboardTeam | null
}

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
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isInstructor = session?.user?.role === "INSTRUCTOR"
  // Session-only dismiss — resets on a full refresh, persists across in-app nav.
  const [eventDismissed, setEventDismissed] = useState(false)

  // The sponsor-team context is its own area: only team members ever see the
  // switcher, and once inside it the sidebar shows the team's sections.
  const inTeam = !!team && !!pathname?.startsWith("/dashboard/team")
  const items = inTeam ? teamNavItems : dashboardNavItems

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
    if (path === "/dashboard") return pathname === path
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

      {team && (
        <div className={cn("px-3 pb-3", !onToggle && "pt-4")}>
          <ContextSwitcher team={team} inTeam={inTeam} onNavigate={onNavigate} />
        </div>
      )}

      <nav className={cn("grid gap-1 px-3 pb-4", !onToggle && !team && "pt-4")}>
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

        {/* Instructors' course tools */}
        {isInstructor && !inTeam && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href="/admin/courses"
              onClick={onNavigate}
              className={linkClass(!!pathname?.startsWith("/admin/courses"))}
            >
              <GraduationCap className="h-5 w-5" />
              Teaching
            </Link>
          </>
        )}
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
 * "Your account ▾ / {team}" — switches the sidebar between the personal area
 * and the sponsor team's admin, like Vercel's team or Hugging Face's org
 * switcher. Rendered only for team members.
 */
function ContextSwitcher({
  team,
  inTeam,
  onNavigate,
}: {
  team: DashboardTeam
  inTeam: boolean
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

  const options = [
    { key: "me", label: "Your account", hint: "Learning, strategies, hackathons", href: "/dashboard", icon: User, active: !inTeam },
    { key: "team", label: team.name, hint: "Sponsor team admin", href: "/dashboard/team", icon: Handshake, active: inTeam },
  ]
  const current = options.find((o) => o.active)!

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
            {inTeam ? "Team" : "Personal"}
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
            <li key={o.key} role="option" aria-selected={o.active}>
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
                {o.active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
