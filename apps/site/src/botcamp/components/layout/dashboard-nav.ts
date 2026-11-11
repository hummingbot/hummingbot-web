import {
  BookOpen,
  Home,
  Lightbulb,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface DashboardNavItem {
  title: string
  href: string
  icon: LucideIcon
}

/**
 * Source of truth for the dashboard nav. Used by the desktop sidebar
 * and the mobile menu so the order, labels, and icons stay in lockstep.
 */
export const dashboardNavItems: DashboardNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Builders Directory", href: "/builders", icon: Users },
  { title: "My Enrollments", href: "/dashboard/enrollments", icon: BookOpen },
  { title: "My Hackathons", href: "/dashboard/hackathons", icon: Trophy },
  { title: "My Strategies", href: "/dashboard/strategies", icon: Lightbulb },
  { title: "My Profile", href: "/dashboard/profile", icon: User },
]
