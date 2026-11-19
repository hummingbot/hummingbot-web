import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { sendCourseInactivityReminder } from "@/botcamp/lib/notifications"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Runs once a day (see vercel.json). Nudges anyone enrolled in a course
 * who made some lesson progress but has gone quiet — once at ~7 days of
 * inactivity, once more at ~30 days. Cohort enrollments are out of scope
 * (cohorts run on a live cohort schedule with human instructors — a
 * course is the self-paced, unattended case this nudge is for). Each tier
 * fires at most once per enrollment ever: the CourseInactivityReminder
 * row created alongside the email (see sendCourseInactivityReminder) is
 * checked here before sending, so a daily re-run never repeats a tier
 * already sent.
 */
export async function GET(request: NextRequest) {
  // Reachable by anyone on the internet (Vercel Cron hits it over plain
  // HTTP, so it can't sit behind session auth) — fail closed if
  // CRON_SECRET isn't configured.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("CRON_SECRET not set - refusing to run course-inactivity cron")
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const weekAgo = new Date(now - 7 * DAY_MS)
  const monthAgo = new Date(now - 30 * DAY_MS)

  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId: { not: null },
      user: { emailCourseUpdates: true },
    },
    select: {
      id: true,
      userId: true,
      course: {
        select: { sections: { select: { lessons: { select: { id: true } } } } },
      },
      inactivityReminders: { select: { tier: true } },
    },
  })

  let matched = 0
  let weekSent = 0
  let monthSent = 0

  for (const enrollment of enrollments) {
    const lessonIds =
      enrollment.course?.sections.flatMap((s) => s.lessons.map((l) => l.id)) ?? []
    if (lessonIds.length === 0) continue

    const sentTiers = new Set(enrollment.inactivityReminders.map((r) => r.tier))
    if (sentTiers.has("WEEK") && sentTiers.has("MONTH")) continue // both already sent

    const progress = await prisma.lessonProgress.findMany({
      where: { userId: enrollment.userId, lessonId: { in: lessonIds } },
      select: { completedAt: true, updatedAt: true },
    })
    if (progress.length === 0) continue // never started — not this reminder's audience

    const completedCount = progress.filter((p) => p.completedAt).length
    if (completedCount === lessonIds.length) continue // finished — nothing to nudge

    const lastActivityAt = progress.reduce(
      (latest, p) => (p.updatedAt > latest ? p.updatedAt : latest),
      progress[0].updatedAt,
    )

    // MONTH takes priority when both thresholds are crossed at once (e.g.
    // this feature shipped after someone had already gone quiet for a
    // month) so a stale enrollment doesn't get both emails in one run.
    const tier =
      lastActivityAt <= monthAgo && !sentTiers.has("MONTH")
        ? "MONTH"
        : lastActivityAt <= weekAgo && !sentTiers.has("WEEK")
          ? "WEEK"
          : null
    if (!tier) continue

    matched++
    const result = await sendCourseInactivityReminder(enrollment.id, tier)
    if (result?.success) {
      if (tier === "WEEK") weekSent++
      else monthSent++
    }
  }

  console.log("Course inactivity cron run:", { matched, weekSent, monthSent })
  return NextResponse.json({ ok: true, matched, weekSent, monthSent })
}
