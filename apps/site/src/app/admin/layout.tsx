import { redirect } from "next/navigation"
import { auth } from "@/botcamp/lib/auth"
import { prisma } from "@/botcamp/lib/prisma"
import { DashboardShell } from "@/botcamp/components/layout/DashboardShell"
import type { DashboardTeam } from "@/botcamp/components/layout/DashboardSidebar"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import { SiteHeader, headerAccount } from "@/components/layout/site-header"

// Botcamp's admin panel, as the "Admin" context of the dashboard (same shell,
// the switcher's third option). Access, as on Botcamp:
// - proxy.ts sends signed-out visits to /signin and keeps instructors on
//   /admin/courses;
// - this layout reads the role from the database (never just the session
//   token) and lets in only ADMIN and INSTRUCTOR;
// - every /api/admin route checks the role again (requireAdmin,
//   requireAdminOrInstructor for the course editor).

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin - Hummingbot",
  robots: { index: false, follow: false },
}

type PrivilegedRole = "ADMIN" | "INSTRUCTOR"

async function checkPrivilegedAccess(userId: string): Promise<PrivilegedRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (user?.role === "ADMIN" || user?.role === "INSTRUCTOR") return user.role
  return null
}

/** The admin's sponsor team, if any, so the switcher can still offer it. */
async function getUserTeam(userId: string): Promise<DashboardTeam | null> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    select: { team: { select: { slug: true, name: true } } },
  })
  return membership?.team ?? null
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin?callbackUrl=%2Fadmin")

  const role = await checkPrivilegedAccess(session.user.id)
  if (!role) redirect("/dashboard")

  const team = await getUserTeam(session.user.id)

  return (
    <>
      <div className={`fixed inset-0 ${pageBackgrounds.default} -z-10`} />
      <SiteHeader account={headerAccount(session)} />
      <DashboardShell team={team} role={role}>
        {children}
      </DashboardShell>
    </>
  )
}
