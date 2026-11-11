import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { botcampPublicAssetUrl } from "@/botcamp/lib/botcamp-assets"
import { agentHoldingReviewSlot } from "@/botcamp/lib/agent-upload"
import { auth } from "@/botcamp/lib/preview-session"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { MemberStatusBanner } from "@/botcamp/components/dashboard/MemberStatusBanner"
import { CondorAgentCard } from "@/botcamp/components/dashboard/CondorAgentCard"
import { PurchaseConfirmationBanner } from "@/botcamp/components/dashboard/PurchaseConfirmationBanner"
import { CompleteProfilePrompt } from "@/botcamp/components/dashboard/CompleteProfilePrompt"
import { EnrollFreeCourseCard } from "@/botcamp/components/dashboard/EnrollFreeCourseCard"
import { CourseListItem } from "@/botcamp/components/courses/CourseListItem"
import { LessonProgressBar } from "@/botcamp/components/learn/LessonProgressBar"
import { cardStyles } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { formatDate } from "@/botcamp/lib/format"
import { BUNDLE_PRICE_CENTS, getPendingBundleDeposit } from "@/botcamp/lib/bundle"
import { getCompletedLessonIds, getLastActivityByLessonId } from "@/botcamp/lib/lesson-progress"
import { BookOpen, GraduationCap, MessageCircle, PiggyBank } from "lucide-react"

export const metadata = {
  title: "Dashboard - Botcamp",
}

// Free intro course we surface on the dashboard for non-enrolled users.
const INTRO_COURSE_SLUG = "intro-to-algo-trading"

async function getDashboardData(userId: string, { includeUnlockedCourses = false } = {}) {
  // Botcamp advances the hackathon stage here (advanceDueHackathonStages, a
  // database write). The read-only preview shows the stage last saved.
  const [enrollments, user, agentInReview, introCourse, unlockedCourses] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      select: {
        id: true,
        enrolledAt: true,
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            thumbnail: true,
            level: true,
            sections: {
              select: {
                lessons: { select: { id: true } },
              },
            },
          },
        },
        cohort: {
          select: {
            id: true,
            slug: true,
            number: true,
            title: true,
            status: true,
            weeks: {
              select: {
                lessons: { select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        role: true,
        isMember: true,
        certified: true,
        tagline: true,
        location: true,
        about: true,
        bundleDepositCohortNumber: true,
        bundleDepositAt: true,
      },
    }),
    // Get the active/registration hackathon
    // A completed hackathon keeps its "results are in" card for a month.
    // The agent holding this person's review slot, for the Condor agent card.
    agentHoldingReviewSlot(userId),
    // The free intro course + whether this user is already enrolled.
    prisma.course.findUnique({
      where: { slug: INTRO_COURSE_SLUG },
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        enrollments: {
          where: { userId },
          select: { id: true },
        },
      },
    }),
    // All published courses — only needed right after a bundle purchase, to
    // show the buyer everything they just unlocked.
    includeUnlockedCourses
      ? prisma.course.findMany({
          where: { published: true },
          select: {
            slug: true,
            title: true,
            thumbnail: true,
            level: true,
            _count: { select: { sections: true } },
            sections: { select: { _count: { select: { lessons: true } } } },
          },
          orderBy: { title: "asc" },
        })
      : Promise.resolve(null),
  ])

  const showIntroCourse =
    !!introCourse &&
    introCourse.published &&
    introCourse.enrollments.length === 0

  // One query for every lesson across every enrollment shown here, so each
  // course/cohort progress bar below is just a lookup, not another round trip.
  const allLessonIds = enrollments.flatMap((e) => [
    ...(e.course?.sections.flatMap((s) => s.lessons.map((l) => l.id)) ?? []),
    ...(e.cohort?.weeks.flatMap((w) => w.lessons.map((l) => l.id)) ?? []),
  ])
  const completedLessonIds = await getCompletedLessonIds(userId, allLessonIds)
  const lastActivityByLessonId = await getLastActivityByLessonId(userId, allLessonIds)

  return {
    enrollments,
    completedLessonIds,
    lastActivityByLessonId,
    user,
    agentInReview,
    introCourse,
    showIntroCourse,
    unlockedCourses,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>
}) {
  const { purchase } = await searchParams
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  const isBundlePurchase = purchase === "bundle"

  const {
    enrollments,
    completedLessonIds,
    lastActivityByLessonId,
    user,
    agentInReview,
    introCourse,
    showIntroCourse,
    unlockedCourses,
  } = await getDashboardData(session.user.id, {
    includeUnlockedCourses: isBundlePurchase,
  })

  // Ranks "most recently active" first — a video started or a quiz
  // answered, not just when the enrollment was created — so someone active
  // in an older enrollment doesn't get bumped by a newer, untouched one.
  // Falls back to enrollment date for enrollments with no activity yet.
  function lastActivityAt(e: (typeof enrollments)[number]): number {
    const lessonIds = [
      ...(e.course?.sections.flatMap((s) => s.lessons.map((l) => l.id)) ?? []),
      ...(e.cohort?.weeks.flatMap((w) => w.lessons.map((l) => l.id)) ?? []),
    ]
    let latest = e.enrolledAt.getTime()
    for (const id of lessonIds) {
      const t = lastActivityByLessonId.get(id)?.getTime()
      if (t && t > latest) latest = t
    }
    return latest
  }

  const courseEnrollments = enrollments
    .filter((e) => e.course)
    .sort((a, b) => lastActivityAt(b) - lastActivityAt(a))
  const cohortEnrollments = enrollments
    .filter((e) => e.cohort)
    .sort((a, b) => lastActivityAt(b) - lastActivityAt(a))
  const bundleDeposit = getPendingBundleDeposit(
    user,
    cohortEnrollments.map((e) => e.cohort!.number),
  )

  // The profile fields we want for every builder. An incomplete profile means
  // the user is effectively new to us, so we greet + nudge accordingly.
  const profileFields = [
    { label: "Tagline", done: Boolean(user?.tagline?.trim()) },
    { label: "Location", done: Boolean(user?.location?.trim()) },
    { label: "About", done: Boolean(user?.about?.trim()) },
  ]
  const profileComplete = profileFields.every((f) => f.done)

  const name = user?.firstName ? `, ${user.firstName}` : ""
  const greeting = profileComplete
    ? `Welcome back${name}!`
    : `Welcome to Botcamp${name}!`
  const subtitle = profileComplete
    ? "Here's an overview of your learning progress"
    : "Let's get your builder profile set up"

  const continueLearningSection = courseEnrollments.length > 0 && (
    <Card>
      <CardHeader>
        <CardTitle>Continue Learning</CardTitle>
        <CardDescription>Pick up where you left off</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-bc-3">
          {courseEnrollments.slice(0, 3).map((enrollment) => {
            const course = enrollment.course!
            const lessons = course.sections.flatMap((section) => section.lessons)
            const completedCount = lessons.filter((l) => completedLessonIds.has(l.id)).length
            const totalLessons = lessons.length
            return (
              <CourseListItem
                key={enrollment.id}
                slug={course.slug}
                title={course.title}
                level={course.level}
                thumbnail={botcampPublicAssetUrl(course.thumbnail)}
                meta={
                  completedCount > 0
                    ? `${completedCount} of ${totalLessons} lessons`
                    : `${totalLessons} lessons`
                }
                completedCount={completedCount}
                totalLessons={totalLessons > 0 ? totalLessons : undefined}
              />
            )
          })}
        </div>
        {courseEnrollments.length > 3 && (
          <div className="mt-4 text-center">
            <Button variant="link" asChild>
              <Link href="/dashboard/enrollments">View all enrollments</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const cohortsSection = (cohortEnrollments.length > 0 || bundleDeposit) && (
    <Card>
      <CardHeader>
        <CardTitle>Your Cohorts</CardTitle>
        <CardDescription>Current cohort memberships</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-bc-4">
          {bundleDeposit && (
            <div className="flex items-center justify-between p-4 rounded-bc-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                  <PiggyBank className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">
                    Cohort {bundleDeposit.cohortNumber}: ${(BUNDLE_PRICE_CENTS / 100).toFixed(0)} deposit paid
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Paid {formatDate(bundleDeposit.depositedAt)} — applied in full toward tuition once enrollment opens.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-primary border border-primary/30 rounded px-2 py-1 shrink-0">
                Deposit
              </span>
            </div>
          )}
          {cohortEnrollments.slice(0, 3).map((enrollment, index) => {
            const cohort = enrollment.cohort!
            const lessons = cohort.weeks.flatMap((week) => week.lessons)
            const completedCount = lessons.filter((l) => completedLessonIds.has(l.id)).length
            const totalLessons = lessons.length

            return (
              <div
                key={enrollment.id}
                className={cn(
                  "flex items-center justify-between gap-4 p-4 rounded-bc-lg border border-border",
                  cardStyles.hover,
                  cardStyles.enter,
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                    <GraduationCap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">
                      Cohort {cohort.number}: {cohort.title}
                    </h3>
                    <StatusBadge value={cohort.status} type="status" />
                    <LessonProgressBar
                      completedCount={completedCount}
                      totalLessons={totalLessons}
                      className="mt-2 max-w-xs"
                    />
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href={`/cohorts/cohort${cohort.number}/learn`}>
                    View Lessons
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>
        {cohortEnrollments.length > 3 && (
          <div className="mt-4 text-center">
            <Button variant="link" asChild>
              <Link href="/dashboard/enrollments">View all enrollments</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-bc-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-bc-tight">{greeting}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {/* 0th: One-shot purchase confirmation banner, driven by ?purchase= from checkout */}
      <PurchaseConfirmationBanner
        purchase={purchase}
        unlockedCourses={unlockedCourses?.map((course) => ({
          slug: course.slug,
          title: course.title,
          level: course.level,
          thumbnail: botcampPublicAssetUrl(course.thumbnail),
          totalLessons: course.sections.reduce(
            (acc, section) => acc + section._count.lessons,
            0,
          ),
        }))}
      />

      {/* 1st: Free intro course CTA — only when the user isn't enrolled yet.
          Skipped right after a bundle purchase — they already have every course. */}
      {showIntroCourse && introCourse && !isBundlePurchase && (
        <EnrollFreeCourseCard
          courseId={introCourse.id}
          courseSlug={introCourse.slug}
          title={introCourse.title}
        />
      )}

      {/* 2nd: Complete-profile nudge (hidden once tagline/location/about set) */}
      <CompleteProfilePrompt fields={profileFields} />

      {/* 3rd: Publishing a Condor agent — the lead card, in place of the
          hackathon one (the hackathon stays one click away in the sidebar).
          Admins aren't held to one agent in review, so theirs always offers
          a new one. */}
      <CondorAgentCard holder={user?.role === "ADMIN" ? null : agentInReview} />

      {/* 4th: Certified-member status */}
      <MemberStatusBanner isCertified={user?.certified ?? false} />

      {/* Cohorts + Continue Learning — a bundle deposit leads with the cohort
          commitment; everyone else sees their courses first, as before. */}
      {bundleDeposit ? (
        <>
          {cohortsSection}
          {continueLearningSection}
        </>
      ) : (
        <>
          {continueLearningSection}
          {cohortsSection}
        </>
      )}

      {/* Join the Community — moved here from /builders */}
      <Card className="bg-gradient-to-br from-indigo-500/15 to-transparent border-indigo-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bc-md bg-indigo-500/15 text-indigo-400">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Join the community</CardTitle>
              <CardDescription>
                Connect with Botcamp builders and the broader Hummingbot community in real time.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a
              href="https://discord.gg/hummingbot"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Join Discord
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Empty state */}
      {enrollments.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={BookOpen}
              title="No enrollments yet"
              description="Browse our courses and cohorts to get started."
              action={
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button asChild variant="outline">
                    <Link href="/botcamp#courses">Browse Courses</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/botcamp#cohorts">Browse Cohorts</Link>
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
