import {
  BookOpen,
  ClipboardList,
  Home,
  Lightbulb,
  Pencil,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface DashboardNavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Other paths that belong to this item (e.g. a course under Learning). */
  match?: string[]
}

/**
 * Source of truth for the dashboard nav, used by the desktop sidebar and the
 * mobile menu. Labels are nouns that mirror the public nav (Learn ↔ Learning,
 * Strategies ↔ Strategies & Agents, Hackathons ↔ Hackathons), with no "My":
 * the whole area is already yours. Profile stays here (Botcamp users look for
 * it) and in the avatar menu; the Builders directory is on the public site,
 * under Community.
 */
export const dashboardNavItems: DashboardNavItem[] = [
  { title: "Home", href: "/dashboard", icon: Home },
  {
    title: "Learning",
    href: "/dashboard/enrollments",
    icon: BookOpen,
    match: ["/dashboard/cohorts", "/dashboard/courses"],
  },
  {
    title: "Strategies & Agents",
    href: "/dashboard/strategies",
    icon: Lightbulb,
    match: ["/dashboard/agents"],
  },
  { title: "Hackathons", href: "/dashboard/hackathons", icon: Trophy },
  { title: "Profile", href: "/dashboard/profile", icon: User, match: ["/dashboard/settings"] },
]

/**
 * The sponsor-team context: what the sidebar shows once a team member
 * switches to their team. Each item opens a tab of Team Administration.
 */
export const teamNavItems: DashboardNavItem[] = [
  { title: "Team info", href: "/dashboard/team?tab=edit", icon: Pencil },
  { title: "Squad", href: "/dashboard/team?tab=manage", icon: Users },
  {
    title: "Applicants",
    href: "/dashboard/team?tab=applicants",
    icon: ClipboardList,
    match: ["/dashboard/team/applications"],
  },
]
