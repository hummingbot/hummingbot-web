"use client"

import { usePathname } from "next/navigation"
import type { BreadcrumbCrumb } from "@/botcamp/components/learn/types"
import { AppShell } from "./AppShell"
import { DashboardSidebar, type NextHackathonEvent, type DashboardTeam } from "./DashboardSidebar"
import { adminNavItems } from "./dashboard-nav"

const SECTION_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard/enrollments", title: "Learning" },
  { prefix: "/dashboard/cohorts", title: "Learning" },
  { prefix: "/dashboard/courses", title: "Learning" },
  { prefix: "/dashboard/strategies", title: "Strategies & Agents" },
  { prefix: "/dashboard/agents", title: "Strategies & Agents" },
  { prefix: "/dashboard/profile", title: "Profile" },
  { prefix: "/dashboard/settings", title: "Settings" },
]

export function DashboardShell({
  children,
  hackathonName,
  nextEvent,
  team,
  role,
}: {
  children: React.ReactNode
  hackathonName?: string | null
  nextEvent?: NextHackathonEvent | null
  team?: DashboardTeam | null
  /** The user's role from the database: ADMIN / INSTRUCTOR get the admin context. */
  role?: string | null
}) {
  const pathname = usePathname() || "/dashboard"

  const sections = [
    ...SECTION_TITLES,
    { prefix: "/dashboard/hackathons", title: hackathonName ?? "Hackathons" },
    { prefix: "/dashboard/team", title: team?.name ?? "Team" },
  ]
  const match = sections.find(
    (s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`),
  )
  const adminSection = adminNavItems
    .filter((i) => i.href !== "/admin")
    .find((i) => [i.href, ...(i.match ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`)))
  const crumbs: BreadcrumbCrumb[] =
    pathname === "/admin" || pathname.startsWith("/admin/")
      ? adminSection
        ? [{ label: "Admin", href: "/admin" }, { label: adminSection.title }]
        : [{ label: "Admin" }, { label: "Overview" }]
      : match
        ? [{ label: "Dashboard", href: "/dashboard" }, { label: match.title }]
        : [{ label: "Dashboard" }, { label: "Home" }]

  return (
    <AppShell
      crumbs={crumbs}
      renderSidebar={(opts) => (
        <DashboardSidebar
          hackathonName={hackathonName}
          nextEvent={nextEvent}
          team={team}
          role={role}
          {...opts}
        />
      )}
    >
      {children}
    </AppShell>
  )
}
