import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Calendar } from "lucide-react"
import { prisma } from "@/botcamp/lib/prisma"
import { formatDuration } from "@/botcamp/lib/format"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import { LearnShell } from "@/botcamp/components/learn/LearnShell"
import { CourseHero, heroStatIcons } from "@/botcamp/components/learn/CourseHero"
import { SectionList } from "@/botcamp/components/learn/SectionList"
import type { LearnGroup } from "@/botcamp/components/learn/types"
import { SiteHeader } from "@/components/layout/site-header"

// Botcamp's public cohort overview (botcamp.xyz/cohorts/cohort<N>), read from
// its database. No sign-in on this site, so it is always Botcamp's signed-out
// view: no progress, lessons locked unless free, CTA → the cohort's landing.
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

  const totalLessons = cohort.weeks.reduce((acc, week) => acc + week.lessons.length, 0)
  const totalDuration = cohort.weeks.reduce(
    (acc, week) =>
      acc + week.lessons.reduce((lessonAcc, lesson) => lessonAcc + (lesson.duration || 0), 0),
    0,
  )

  const cohortTitle = cohort.title || `Cohort ${cohort.number}`
  const dateRange = formatDateRange(cohort.startDate, cohort.endDate)

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
    })),
  }))

  // Hero stats row — modules · lessons · duration · dates.
  const stats: Array<{ icon: typeof Calendar; label: string }> = [
    { icon: heroStatIcons.modules, label: `${cohort.weeks.length} weeks` },
    { icon: heroStatIcons.lessons, label: `${totalLessons} lessons` },
    ...(totalDuration > 0 ? [{ icon: heroStatIcons.duration, label: formatDuration(totalDuration) }] : []),
    { icon: Calendar, label: dateRange },
  ]

  return (
    <>
      <div className={`fixed inset-0 ${pageBackgrounds.default} -z-10`} />
      <SiteHeader />
      <LearnShell
        groups={groups}
        resourceKind="cohort"
        resourceSlug={String(cohort.number)}
        hasAccess={false}
        initialCollapsed
        title={cohortTitle}
        crumbs={[{ label: "Cohorts", href: "/botcamp#cohorts" }, { label: cohortTitle }]}
      >
        <CourseHero
          title={cohortTitle}
          description={cohort.description}
          stats={stats}
          cta={{ label: "Enroll", href: `/cohorts/cohort${cohortNumber}/landing` }}
          secondaryCta={{ label: "See Cohort 13 recap", href: "/cohorts/cohort13/recap" }}
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
            hasAccess={false}
          />
        )}
      </LearnShell>
    </>
  )
}
