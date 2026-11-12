import { notFound } from "next/navigation"
import { DashboardShell } from "@/botcamp/components/layout/DashboardShell"
import { ReadOnlyFetchGuard } from "@/botcamp/components/layout/ReadOnlyFetchGuard"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { auth, isDashboardPreviewEnabled } from "@/botcamp/lib/preview-session"
import { PreviewSessionProvider } from "@/botcamp/lib/preview-session-client"
import { nextSession, resolveSessionUrl } from "@/botcamp/lib/hackathon-sessions"
import { SiteHeader } from "@/components/layout/site-header"
import type { NextHackathonEvent, DashboardTeam } from "@/botcamp/components/layout/DashboardSidebar"

// Botcamp's user dashboard, as a READ-ONLY preview with no login: every page
// renders as the Botcamp user named by DASHBOARD_PREVIEW_USER. It shows a real
// user's data without authentication, so it exists only in development: in
// production, or without that variable (or with an email that isn't a user),
// every /dashboard route is a 404. Nothing here can write — the Prisma client
// refuses writes, the buttons that would change anything are disabled, and
// ReadOnlyFetchGuard answers any write request in the browser.

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
  // Botcamp advances the hackathon stage here first (advanceDueHackathonStages,
  // a database write). This preview only reads: it shows the stage last saved.
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

/** Resolve the preview user's sponsor team, if any, for the sidebar's team switcher. */
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
  // The guard: never in production, never without a known preview user.
  if (process.env.NODE_ENV === "production" || !isDashboardPreviewEnabled()) notFound()
  const session = await auth()
  if (!session) notFound()

  const [{ name, nextEvent }, team] = await Promise.all([
    getActiveHackathon(),
    getUserTeam(session.user.id),
  ])

  return (
    <PreviewSessionProvider session={session}>
      <ReadOnlyFetchGuard />
      {/* Subtle page gradient, matching marketing surfaces */}
      <div className={`fixed inset-0 ${pageBackgrounds.default} -z-10`} />

      <SiteHeader
        account={{
          name: session.user.name,
          // Botcamp-relative avatars aren't served here; those fall back to initials.
          image: session.user.image?.startsWith("http") ? session.user.image : null,
          isAdmin: session.user.role === "ADMIN" }}
      />
      <DashboardShell hackathonName={name} nextEvent={nextEvent} team={team}>
        {children}
      </DashboardShell>
    </PreviewSessionProvider>
  )
}
