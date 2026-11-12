"use client"

import { usePathname } from "next/navigation"
import type { BreadcrumbCrumb } from "@/botcamp/components/learn/types"
import { AppShell } from "./AppShell"
import { DashboardSidebar, type NextHackathonEvent, type DashboardTeam } from "./DashboardSidebar"

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
}: {
  children: React.ReactNode
  hackathonName?: string | null
  nextEvent?: NextHackathonEvent | null
  team?: DashboardTeam | null
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
  const crumbs: BreadcrumbCrumb[] = match
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
          {...opts}
        />
      )}
    >
      {children}
    </AppShell>
  )
}
