import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Calendar } from "lucide-react"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { getLessonProgressStatuses, resolveResumeLesson } from "@/botcamp/lib/lesson-progress"
import { formatDuration } from "@/botcamp/lib/format"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import { LearnShell } from "@/botcamp/components/learn/LearnShell"
import { CourseHero, heroStatIcons } from "@/botcamp/components/learn/CourseHero"
import { SectionList } from "@/botcamp/components/learn/SectionList"
import type { LearnGroup } from "@/botcamp/components/learn/types"
import { SiteHeader } from "@/components/layout/site-header"

// Botcamp's public cohort overview (botcamp.xyz/cohorts/cohort<N>), read from
// its database. Enrolled members (and admins) see their progress and a
// Continue CTA; everyone else gets Enroll → the cohort's landing.
// Completed cohorts (13 included) redirect to their recap, as in Botcamp.

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ cohortNumber: string }>
}

async function getCohort(cohortNumber: number) {
  return prisma.cohort.findUnique({
    where: { number: cohortNumber },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              type: true,
              duration: true,
              isFree: true,
            },
          },
        },
      },
    },
  })
}

function parseCohortNumber(param: string) {
  return parseInt(param.replace("cohort", ""))
}

export async function generateMetadata({ params }: PageProps) {
  const { cohortNumber: cohortNumberStr } = await params
  const cohortNumber = parseCohortNumber(cohortNumberStr)
  if (isNaN(cohortNumber)) return { title: "Cohort Not Found" }
  const cohort = await getCohort(cohortNumber)

  if (!cohort) return { title: "Cohort Not Found" }

  const title = cohort.title || `Cohort ${cohort.number}`
  const description =
    cohort.description ||
    `Botcamp Cohort ${cohort.number} — a graduating class of crypto market makers and algorithmic traders.`
  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `/cohorts/cohort${cohort.number}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

async function checkEnrollment(userId: string | undefined, cohortId: string) {
  if (!userId) return false
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, cohortId },
  })
  return !!enrollment
}

async function checkIsAdmin(userId: string | undefined) {
  if (!userId) return false
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role === "ADMIN"
}

function formatDateRange(start: Date, end: Date) {
  const startStr = new Date(start).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })
  const endStr = new Date(end).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  return `${startStr} - ${endStr}`
}

export default async function CohortDetailPage({ params }: PageProps) {
  const { cohortNumber: cohortNumberStr } = await params
  const cohortNumber = parseCohortNumber(cohortNumberStr)
  if (isNaN(cohortNumber)) notFound()

  // Cohort 13 is treated as a past cohort — point visitors at the recap.
  if (cohortNumber === 13) {
    redirect("/cohorts/cohort13/recap")
  }

  const cohort = await getCohort(cohortNumber)
  if (!cohort) {
    // Not in Botcamp: the next cohort before it has a row (Cohort 14 while
    // interest is still being registered) goes to /botcamp, whose cohorts
    // section is where that happens. Any other missing cohort is a 404.
    const latest = await prisma.cohort.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    })
    if (latest && cohortNumber === latest.number + 1) redirect("/botcamp#cohorts")
    notFound()
  }

  // Completed cohorts get a dedicated recap surface.
  if (cohort.status === "COMPLETED") {
    redirect(`/cohorts/cohort${cohortNumber}/recap`)
  }

  const session = await auth()
  const [isEnrolled, isAdmin] = await Promise.all([
    checkEnrollment(session?.user?.id, cohort.id),
    checkIsAdmin(session?.user?.id),
  ])
  const hasAccess = isEnrolled || isAdmin

  const totalLessons = cohort.weeks.reduce((acc, week) => acc + week.lessons.length, 0)
  const totalDuration = cohort.weeks.reduce(
    (acc, week) =>
      acc + week.lessons.reduce((lessonAcc, lesson) => lessonAcc + (lesson.duration || 0), 0),
    0,
  )

  const cohortTitle = cohort.title || `Cohort ${cohort.number}`
  const dateRange = formatDateRange(cohort.startDate, cohort.endDate)

  const firstLesson = cohort.weeks[0]?.lessons[0]
  const allLessons = cohort.weeks.flatMap((week) => week.lessons)
  const progressStatuses = await getLessonProgressStatuses(
    session?.user?.id,
    allLessons.map((l) => l.id),
  )
  const completedLessonIds = new Set(
    [...progressStatuses].filter(([, status]) => status === "completed").map(([id]) => id),
  )
  const resumeLesson = isEnrolled ? resolveResumeLesson(allLessons, completedLessonIds) : firstLesson

  // Cohort weeks → LearnGroup shape. Sidebar + SectionList both consume.
  const groups: LearnGroup[] = cohort.weeks.map((week) => ({
    id: week.id,
    title: week.title,
    number: week.weekNumber,
    lessons: week.lessons.map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      type: lesson.type,
      duration: lesson.duration,
      isFree: lesson.isFree,
      progressStatus: progressStatuses.get(lesson.id),
    })),
  }))

  // Hero stats row — modules · lessons · duration · dates.
  const stats: Array<{ icon: typeof Calendar; label: string }> = [
    { icon: heroStatIcons.modules, label: `${cohort.weeks.length} weeks` },
    { icon: heroStatIcons.lessons, label: `${totalLessons} lessons` },
    ...(totalDuration > 0 ? [{ icon: heroStatIcons.duration, label: formatDuration(totalDuration) }] : []),
    { icon: Calendar, label: dateRange },
  ]

  // CTA — Continue/view for enrolled+content, "No content yet" for
  // enrolled+empty, Enroll for unenrolled.
  const cta = hasAccess
    ? resumeLesson
      ? {
          label: isEnrolled ? "Continue learning" : "View content",
          href: `/cohorts/cohort${cohortNumber}/learn/${resumeLesson.slug}`,
        }
      : { label: "No content yet", href: "/botcamp#cohorts" }
    : { label: "Enroll", href: `/cohorts/cohort${cohortNumber}/landing` }

  return (
    <>
      <div className={`fixed inset-0 ${pageBackgrounds.default} -z-10`} />
      <SiteHeader />
      <LearnShell
        groups={groups}
        resourceKind="cohort"
        resourceSlug={String(cohort.number)}
        hasAccess={hasAccess}
        initialCollapsed
        title={cohortTitle}
        crumbs={[{ label: "Cohorts", href: "/botcamp#cohorts" }, { label: cohortTitle }]}
      >
        <CourseHero
          title={cohortTitle}
          description={cohort.description}
          stats={stats}
          cta={cta}
          secondaryCta={hasAccess ? null : { label: "See Cohort 13 recap", href: "/cohorts/cohort13/recap" }}
        />

        {groups.length === 0 ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
            <div className="mx-auto max-w-6xl text-center py-16">
              <p className="text-muted-foreground">No content available yet for this cohort.</p>
              <Link
                href="/botcamp#cohorts"
                className="text-sm text-primary hover:underline inline-flex items-center mt-4"
              >
                Browse other cohorts →
              </Link>
            </div>
          </div>
        ) : (
          <SectionList
            groups={groups}
            resourceKind="cohort"
            resourceSlug={String(cohort.number)}
            hasAccess={hasAccess}
          />
        )}
      </LearnShell>
    </>
  )
}
