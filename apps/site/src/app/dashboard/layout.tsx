import { redirect } from "next/navigation"
import { DashboardShell } from "@/botcamp/components/layout/DashboardShell"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"
import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { auth } from "@/botcamp/lib/auth"
import { nextSession, resolveSessionUrl } from "@/botcamp/lib/hackathon-sessions"
import { SiteHeader, headerAccount } from "@/components/layout/site-header"
import type { NextHackathonEvent, DashboardTeam } from "@/botcamp/components/layout/DashboardSidebar"

// Botcamp's user dashboard, for the signed-in user (signed-out visitors go to
// /signin and come back).

export const dynamic = "force-dynamic"

export const metadata = {
  robots: { index: false, follow: false },
}

const SESSION_SELECT = {
  select: { title: true, date: true, videoId: true },
  orderBy: { date: "asc" as const },
}

/** Resolve the current hackathon's name + next event for the sidebar. */
async function getActiveHackathon(): Promise<{
  name: string | null
  nextEvent: NextHackathonEvent | null
}> {
  // Move any hackathon whose race clock has passed to its next stage first.
  await advanceDueHackathonStages()
  const live = await prisma.hackathon.findFirst({
    where: { status: { in: CURRENT_HACKATHON_STATUSES } },
    orderBy: { startDate: "desc" },
    select: { title: true, sessions: SESSION_SELECT },
  })
  const h =
    live ??
    (await prisma.hackathon.findFirst({
      where: { status: { not: "DRAFT" } },
      orderBy: { startDate: "desc" },
      select: { title: true, sessions: SESSION_SELECT },
    }))

  if (!h) return { name: null, nextEvent: null }

  const upcoming = nextSession(
    h.sessions.map((s) => ({
      title: s.title,
      date: s.date ? s.date.toISOString() : null,
      videoId: s.videoId,
    })),
    new Date(),
  )
  const nextEvent =
    upcoming && upcoming.date
      ? { title: upcoming.title, date: upcoming.date, url: resolveSessionUrl(upcoming.videoId) }
      : null

  return { name: h.title, nextEvent }
}

/** Resolve the user's sponsor team, if any, for the sidebar's team switcher. */
/** The role, fresh from the database (not the session token): decides the admin context. */
async function getUserRole(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role ?? null
}

async function getUserTeam(userId: string): Promise<DashboardTeam | null> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    select: { team: { select: { slug: true, name: true } } },
  })

  return membership?.team ?? null
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  // Layouts don't see the URL, so a signed-out visit lands on /dashboard after sign-in.
  if (!session?.user?.id) redirect("/signin?callbackUrl=%2Fdashboard")

  const [{ name, nextEvent }, team, role] = await Promise.all([
    getActiveHackathon(),
    getUserTeam(session.user.id),
    getUserRole(session.user.id),
  ])

  return (
    <>
      {/* Subtle page gradient, matching marketing surfaces */}
      <div className={`fixed inset-0 ${pageBackgrounds.default} -z-10`} />

      <SiteHeader account={headerAccount(session)} />
      <DashboardShell hackathonName={name} nextEvent={nextEvent} team={team} role={role}>
        {children}
      </DashboardShell>
    </>
  )
}
