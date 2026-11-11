'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "@/botcamp/lib/preview-session-client"
import { Shield, LogOut, GraduationCap, Handshake, PanelLeft, Bell, X } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { SITE_NAME } from "@/botcamp/lib/site"
import { dashboardNavItems, type DashboardNavItem } from "./dashboard-nav"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

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
  /** Sponsor team the current user belongs to, if any — shows the "My Team" link. */
  team?: DashboardTeam | null
}

const HACKATHON_HREF = "/dashboard/hackathons"

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
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const isInstructor = session?.user?.role === "INSTRUCTOR"
  // Session-only dismiss — resets on a full refresh, persists across in-app nav.
  const [eventDismissed, setEventDismissed] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && !!pathname?.startsWith(href))

  // The next-event promo card still uses the hackathon data; the nav item
  // itself is a plain "Hackathon Hub" entry styled like every other item.
  void hackathonName

  // Order: Dashboard, then the hackathon hub, then the rest.
  const dashboardItem = dashboardNavItems.find((i) => i.href === "/dashboard")
  const hackathonItem = dashboardNavItems.find((i) => i.href === HACKATHON_HREF)
  const rest = dashboardNavItems.filter(
    (i) => i.href !== "/dashboard" && i.href !== HACKATHON_HREF,
  )

  const renderItem = (item: DashboardNavItem, opts?: { label?: string; highlighted?: boolean }) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onNavigate}
      className={linkClass(isActive(item.href), opts?.highlighted)}
    >
      <item.icon className="h-5 w-5" />
      {opts?.label ?? item.title}
    </Link>
  )

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

      <nav className={cn("grid gap-1 px-3 pb-4", !onToggle && "pt-4")}>
        {dashboardItem && renderItem(dashboardItem)}
        {hackathonItem && renderItem(hackathonItem, { label: "Hackathon Hub" })}
        {rest.map((item) => renderItem(item))}

        {/* My Team - sponsor team members only */}
        {team && (
          <Link
            href="/dashboard/team"
            onClick={onNavigate}
            className={linkClass(!!pathname?.startsWith("/dashboard/team"))}
          >
            <Handshake className="h-5 w-5" />
            Team Administration
          </Link>
        )}

        {/* Sign out */}
        <ReadOnlyHint block><button
          onClick={async () => {
            await signOut({ redirect: false })
            window.location.href = "/"
          }}
          className="flex w-full items-center gap-3 rounded-bc-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
          disabled>
          <LogOut className="h-5 w-5" />
          Sign Out
        </button></ReadOnlyHint>

        {/* Admin Panel - admins only */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href="/admin"
              onClick={onNavigate}
              className={linkClass(!!pathname?.startsWith("/admin"))}
            >
              <Shield className="h-5 w-5" />
              Admin Panel
            </Link>
          </>
        )}

        {/* My Courses (Instructor) - instructors only */}
        {isInstructor && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href="/admin/courses"
              onClick={onNavigate}
              className={linkClass(!!pathname?.startsWith("/admin/courses"))}
            >
              <GraduationCap className="h-5 w-5" />
              My Courses
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
            <p className="mb-1 pr-6 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">
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
