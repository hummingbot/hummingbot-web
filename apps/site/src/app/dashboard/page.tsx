import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { botcampPublicAssetUrl } from "@/botcamp/lib/botcamp-assets"
import { agentHoldingReviewSlot } from "@/botcamp/lib/agent-upload"
import { auth } from "@/botcamp/lib/preview-session"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { MemberStatusBanner } from "@/botcamp/components/dashboard/MemberStatusBanner"
import { PurchaseConfirmationBanner } from "@/botcamp/components/dashboard/PurchaseConfirmationBanner"
import { CourseListItem } from "@/botcamp/components/courses/CourseListItem"
import { LessonProgressBar } from "@/botcamp/components/learn/LessonProgressBar"
import type { CourseLevel } from "@/botcamp/lib/course-level"
import { formatDate } from "@/botcamp/lib/format"
import { BUNDLE_PRICE_CENTS, getPendingBundleDeposit } from "@/botcamp/lib/bundle"
import { JOINABLE_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { getCompletedLessonIds, getLastActivityByLessonId } from "@/botcamp/lib/lesson-progress"
import {
  ArrowRight,
  BookOpen,
  Bot,
  GraduationCap,
  type LucideIcon,
  PiggyBank,
  Trophy,
  UserRound,
} from "lucide-react"

export const metadata = {
  title: "Dashboard - Botcamp",
}

// Free intro course we surface on the dashboard for non-enrolled users.
const INTRO_COURSE_SLUG = "intro-to-algo-trading"

async function getDashboardData(userId: string, { includeUnlockedCourses = false } = {}) {
  // Botcamp advances the hackathon stage here (advanceDueHackathonStages, a
  // database write). The read-only preview shows the stage last saved.
  const [enrollments, user, agentInReview, introCourse, unlockedCourses, strategyCount, openHackathon] = await Promise.all([
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
    // Whether they've published anything yet (strategy or agent).
    prisma.strategyAuthor.count({ where: { userId } }),
    // The hackathon a newcomer can still join, and whether they applied.
    prisma.hackathon.findFirst({
      where: { status: { in: JOINABLE_HACKATHON_STATUSES } },
      orderBy: { startDate: "asc" },
      select: {
        slug: true,
        title: true,
        registrationEnd: true,
        applications: { where: { userId }, select: { id: true }, take: 1 },
      },
    }),
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
    strategyCount,
    openHackathon,
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
    strategyCount,
    openHackathon,
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

  const bundleDeposit = getPendingBundleDeposit(
    user,
    enrollments.filter((e) => e.cohort).map((e) => e.cohort!.number),
  )

  // The profile fields we want for every builder.
  const profileFields = [
    { label: "Tagline", done: Boolean(user?.tagline?.trim()) },
    { label: "Location", done: Boolean(user?.location?.trim()) },
    { label: "About", done: Boolean(user?.about?.trim()) },
  ]
  const missingProfile = profileFields.filter((f) => !f.done).length

  // Every enrollment as one learning item, most recently active first. The
  // first one is "Continue where you left off"; the rest are listed below it.
  type LearningItem = {
    id: string
    kind: "Course" | "Cohort"
    title: string
    href: string
    completed: number
    total: number
    lastActive: number
    level?: CourseLevel | null
    thumbnail?: string | null
    slug?: string
    status?: string
  }
  const learning: LearningItem[] = enrollments
    .map((e): LearningItem | null => {
      if (e.course) {
        const lessons = e.course.sections.flatMap((s) => s.lessons)
        return {
          id: e.id,
          kind: "Course",
          title: e.course.title,
          href: `/courses/${e.course.slug}/learn`,
          completed: lessons.filter((l) => completedLessonIds.has(l.id)).length,
          total: lessons.length,
          lastActive: lastActivityAt(e),
          level: e.course.level,
          thumbnail: botcampPublicAssetUrl(e.course.thumbnail),
          slug: e.course.slug,
        }
      }
      if (e.cohort) {
        const lessons = e.cohort.weeks.flatMap((w) => w.lessons)
        return {
          id: e.id,
          kind: "Cohort",
          title: `Cohort ${e.cohort.number}: ${e.cohort.title}`,
          href: `/cohorts/cohort${e.cohort.number}/learn`,
          completed: lessons.filter((l) => completedLessonIds.has(l.id)).length,
          total: lessons.length,
          lastActive: lastActivityAt(e),
          status: e.cohort.status,
        }
      }
      return null
    })
    .filter((x): x is LearningItem => x !== null)
    .sort((a, b) => b.lastActive - a.lastActive)

  // Lead with something unfinished (a cohort that already ended doesn't
  // count); finished ones stay in the list below.
  const current =
    learning.find((l) => l.status !== "COMPLETED" && (l.total === 0 || l.completed < l.total)) ?? null
  const others = learning.filter((l) => l !== current)
  const isNew = learning.length === 0 && strategyCount === 0

  // Up to three next steps, most time-sensitive first. No zero counters:
  // each step only shows when it's actually the next thing to do.
  type Step = { icon: LucideIcon; title: string; body: string; href: string; cta: string }
  const steps: Step[] = []
  if (bundleDeposit) {
    steps.push({
      icon: PiggyBank,
      title: `Cohort ${bundleDeposit.cohortNumber}: $${(BUNDLE_PRICE_CENTS / 100).toFixed(0)} deposit paid`,
      body: `Paid ${formatDate(bundleDeposit.depositedAt)}, applied in full toward tuition once enrollment opens.`,
      href: "/botcamp#cohorts",
      cta: "See the cohort",
    })
  }
  if (openHackathon && openHackathon.applications.length === 0) {
    steps.push({
      icon: Trophy,
      title: `Apply to the ${openHackathon.title}`,
      body: openHackathon.registrationEnd
        ? `Applications close ${formatDate(openHackathon.registrationEnd)}. Race your agent with real capital.`
        : "Race your agent with real capital, sponsored by the exchanges.",
      href: `/dashboard/hackathons/${openHackathon.slug}`,
      cta: "Apply",
    })
  }
  if (agentInReview && user?.role !== "ADMIN") {
    steps.push({
      icon: Bot,
      title: `${agentInReview.title} is in review`,
      body: `Version ${agentInReview.version} is waiting for approval. You'll be notified when it's live in the Hub.`,
      href: `/dashboard/strategies/${agentInReview.strategyId}`,
      cta: "View agent",
    })
  } else if (strategyCount === 0) {
    steps.push({
      icon: Bot,
      title: "Publish your first agent",
      body: "Turn a strategy into a Condor agent that others can clone from the Hub.",
      href: "/dashboard/agents/new",
      cta: "Create Condor agent",
    })
  }
  if (missingProfile > 0) {
    steps.push({
      icon: UserRound,
      title: "Complete your builder profile",
      body: `${missingProfile} of ${profileFields.length} fields left (${profileFields
        .filter((f) => !f.done)
        .map((f) => f.label.toLowerCase())
        .join(", ")}). Sponsors read it when they pick their squad.`,
      href: "/dashboard/profile",
      cta: "Edit profile",
    })
  }

  // For someone with nothing yet: one card per path, instead of empty lists.
  const paths: Step[] = [
    {
      icon: BookOpen,
      title: "Start learning",
      body: showIntroCourse && introCourse
        ? `${introCourse.title} is free. Learn the basics of algo trading and market making.`
        : "Self-paced courses and live cohorts, from basics to advanced.",
      href: "/botcamp#courses",
      cta: "Browse courses",
    },
    {
      icon: Bot,
      title: "Publish an agent",
      body: "Already trading? Turn your strategy into a Condor agent others can clone.",
      href: "/dashboard/agents/new",
      cta: "Create Condor agent",
    },
    {
      icon: Trophy,
      title: openHackathon ? `Join the ${openHackathon.title}` : "Join the next Cup",
      body: "Build with a squad sponsored by an exchange and race with real capital.",
      href: openHackathon ? `/dashboard/hackathons/${openHackathon.slug}` : "/hackathons",
      cta: "See hackathons",
    },
  ]

  const name = user?.firstName ? `, ${user.firstName}` : ""

  return (
    <div className="space-y-bc-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-bc-tight">
          {isNew ? `Welcome${name}!` : `Welcome back${name}!`}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isNew ? "Where do you want to start?" : "Pick up where you left off."}
        </p>
      </div>

      {/* One-shot purchase confirmation banner, driven by ?purchase= from checkout */}
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

      {/* 1. Continue where you left off */}
      {current && (
        <section className="relative overflow-hidden rounded-bc-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Continue where you left off · {current.kind}
          </p>
          <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold tracking-bc-tight md:text-3xl">{current.title}</h2>
              {current.status && <StatusBadge value={current.status} type="status" />}
              {current.total > 0 && (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {current.completed > 0
                      ? `${current.completed} of ${current.total} lessons done · ${current.total - current.completed} to go`
                      : `${current.total} lessons`}
                  </p>
                  <LessonProgressBar
                    completedCount={current.completed}
                    totalLessons={current.total}
                    className="mt-3 max-w-md"
                  />
                </>
              )}
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href={current.href}>
                {current.completed > 0 ? "Continue" : "Start"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* New here: one card per path */}
      {isNew && (
        <section>
          <ul className="grid gap-4 md:grid-cols-3">
            {paths.map((p) => (
              <StepCard key={p.title} step={p} large />
            ))}
          </ul>
        </section>
      )}

      {/* 2. Next steps (at most three) */}
      {!isNew && steps.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Next steps
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {steps.slice(0, 3).map((step) => (
              <StepCard key={step.title} step={step} />
            ))}
          </ul>
        </section>
      )}

      {/* Certification, once earned (or how to earn it) */}
      {!isNew && <MemberStatusBanner isCertified={user?.certified ?? false} />}

      {/* 3. The rest of their learning */}
      {others.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Your learning</CardTitle>
            <Button variant="link" asChild className="px-0">
              <Link href="/dashboard/enrollments">
                All learning <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-bc-3">
              {others.slice(0, 3).map((item) =>
                item.kind === "Course" ? (
                  <CourseListItem
                    key={item.id}
                    slug={item.slug!}
                    title={item.title}
                    level={item.level}
                    thumbnail={item.thumbnail ?? undefined}
                    meta={
                      item.completed > 0
                        ? `${item.completed} of ${item.total} lessons`
                        : `${item.total} lessons`
                    }
                    completedCount={item.completed}
                    totalLessons={item.total > 0 ? item.total : undefined}
                  />
                ) : (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-4 rounded-bc-lg border border-border p-4 transition-colors hover:bg-accent"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
                      <GraduationCap className="h-6 w-6 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{item.title}</span>
                      <LessonProgressBar
                        completedCount={item.completed}
                        totalLessons={item.total}
                        className="mt-2 max-w-xs"
                      />
                    </span>
                  </Link>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StepCard({ step, large = false }: { step: { icon: LucideIcon; title: string; body: string; href: string; cta: string }; large?: boolean }) {
  const Icon = step.icon
  return (
    <li className="flex flex-col rounded-bc-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-bc-md bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className={large ? "mt-4 text-lg font-semibold" : "mt-4 font-semibold"}>{step.title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      <Link
        href={step.href}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        {step.cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </li>
  )
}
