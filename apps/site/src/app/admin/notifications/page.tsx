import { prisma } from "@/botcamp/lib/prisma"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/botcamp/lib/api-utils"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { NotificationsTabs } from "@/botcamp/components/admin/NotificationsTabs"
import { auth } from "@/botcamp/lib/auth"

export const metadata = {
  title: "Notifications - Admin - Botcamp",
}

const AUDIENCE_LABELS: Record<string, string> = {
  myself: "Test (Self)",
  all_users: "All Users",
  all_members: "All Members",
  course_students: "Course Students",
  admin_users: "Admins",
  cohort: "Cohort",
  hackathon: "Hackathon Registrants",
  specific_user: "Specific User",
}

const WELCOME_SERIES_STEPS: { day: number; label: string; type: string }[] = [
  { day: 0, label: "Day 0", type: "WELCOME" },
  { day: 3, label: "Day 3", type: "WELCOME_DAY3" },
  { day: 7, label: "Day 7", type: "WELCOME_DAY7" },
  { day: 14, label: "Day 14", type: "WELCOME_DAY14" },
  { day: 21, label: "Day 21", type: "WELCOME_DAY21" },
  { day: 28, label: "Day 28", type: "WELCOME_DAY28" },
]

async function getWelcomeSeriesStats() {
  const rows = await prisma.$queryRaw<
    { type: string; sent: bigint; delivered: bigint; opened: bigint; clicked: bigint; bounced: bigint }[]
  >`
    SELECT
      type,
      COUNT(*) FILTER (WHERE status != 'FAILED') AS sent,
      COUNT("deliveredAt") AS delivered,
      COUNT("openedAt") AS opened,
      COUNT("clickedAt") AS clicked,
      COUNT("bouncedAt") AS bounced
    FROM notifications
    WHERE type IN ('WELCOME', 'WELCOME_DAY3', 'WELCOME_DAY7', 'WELCOME_DAY14', 'WELCOME_DAY21', 'WELCOME_DAY28')
    GROUP BY type
  `

  const byType = new Map(rows.map((r) => [r.type, r]))

  return WELCOME_SERIES_STEPS.map(({ day, label, type }) => {
    const row = byType.get(type)
    return {
      day,
      label,
      sent: Number(row?.sent ?? 0),
      delivered: Number(row?.delivered ?? 0),
      opened: Number(row?.opened ?? 0),
      clicked: Number(row?.clicked ?? 0),
      bounced: Number(row?.bounced ?? 0),
    }
  })
}

async function getBroadcastEngagementStats(broadcastIds: string[]) {
  if (broadcastIds.length === 0) return new Map<string, { delivered: number; opened: number; clicked: number; bounced: number }>()

  const rows = await prisma.notification.groupBy({
    by: ['broadcastId'],
    where: { broadcastId: { in: broadcastIds } },
    _count: { deliveredAt: true, openedAt: true, clickedAt: true, bouncedAt: true },
  })

  return new Map(
    rows
      .filter((r): r is typeof r & { broadcastId: string } => r.broadcastId !== null)
      .map((r) => [
        r.broadcastId,
        {
          delivered: r._count.deliveredAt,
          opened: r._count.openedAt,
          clicked: r._count.clickedAt,
          bounced: r._count.bouncedAt,
        },
      ])
  )
}

async function getBroadcastData() {
  const [totalUsers, totalMembers, totalCourseStudents, totalAdmins, newsletterCount, cohorts, hackathons, broadcasts, users, welcomeSeriesStats] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isMember: true } }),
    prisma.user.count({
      where: {
        enrollments: {
          some: {
            courseId: { not: null },
            cohortId: null,
          },
        },
      },
    }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { newsletterSubscribed: true } }),
    prisma.cohort.findMany({
      select: {
        id: true,
        number: true,
        title: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { number: 'desc' },
    }),
    prisma.hackathon.findMany({
      where: {
        status: { not: 'DRAFT' },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        _count: {
          select: {
            entries: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    }),
    prisma.broadcast.findMany({
      select: {
        id: true,
        subject: true,
        body: true,
        audienceType: true,
        cohortNumber: true,
        hackathonSlug: true,
        recipientCount: true,
        sentAt: true,
        sentBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { email: 'asc' },
    }),
    getWelcomeSeriesStats(),
  ])

  const engagementByBroadcastId = await getBroadcastEngagementStats(broadcasts.map((b) => b.id))
  const broadcastsWithStats = broadcasts.map((b) => ({
    ...b,
    stats: engagementByBroadcastId.get(b.id) ?? null,
  }))

  return { totalUsers, totalMembers, totalCourseStudents, totalAdmins, newsletterCount, cohorts, hackathons, broadcasts: broadcastsWithStats, users, welcomeSeriesStats }
}

export default async function AdminNotificationsPage() {
  // The admin layout also admits INSTRUCTORs (for their courses); this page
  // holds admin-only data, so send anyone else back to their courses.
  if (!(await requireAdmin())) redirect("/admin/courses")

  const [broadcastData, session] = await Promise.all([
    getBroadcastData(),
    auth(),
  ])

  // Get current user details for preview
  const currentUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, email: true },
      })
    : null

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Notifications"
        description="Send broadcast emails to user segments"
        variant="admin"
      />

      <NotificationsTabs
        cohorts={broadcastData.cohorts}
        hackathons={broadcastData.hackathons}
        users={broadcastData.users}
        totalUsers={broadcastData.totalUsers}
        totalMembers={broadcastData.totalMembers}
        totalCourseStudents={broadcastData.totalCourseStudents}
        totalAdmins={broadcastData.totalAdmins}
        currentUser={currentUser}
        broadcasts={broadcastData.broadcasts}
        audienceLabels={AUDIENCE_LABELS}
        newsletterCount={broadcastData.newsletterCount}
        welcomeSeriesStats={broadcastData.welcomeSeriesStats}
      />
    </div>
  )
}
