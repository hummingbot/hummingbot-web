import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { LessonAccessDenied } from "@/botcamp/components/lessons/LessonAccessDenied"
import { LearnShell } from "@/botcamp/components/learn/LearnShell"
import { LessonBody } from "@/botcamp/components/learn/LessonBody"
import type { LearnGroup } from "@/botcamp/components/learn/types"
import { getLessonProgressMap, getLessonProgressStatuses } from "@/botcamp/lib/lesson-progress"
import { auth, isDashboardPreviewEnabled } from "@/botcamp/lib/preview-session"

interface PageProps {
  params: Promise<{ cohortNumber: string; lessonSlug: string }>
}

async function getCohortLessons(cohortNumber: number, lessonSlug: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { number: cohortNumber },
    select: {
      id: true,
      number: true,
      title: true,
      slug: true,
      weeks: {
        orderBy: { weekNumber: "asc" },
        select: {
          id: true,
          weekNumber: true,
          title: true,
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              type: true,
              duration: true,
              isFree: true,
              content: true,
              transcript: true,
              slidesURL: true,
              videoId: true,
              quizData: true,
            },
          },
        },
      },
    },
  })
  if (!cohort) return null

  // Flatten to find active + neighbor pointers.
  const flat = cohort.weeks.flatMap((week) =>
    week.lessons.map((lesson) => ({
      ...lesson,
      weekNumber: week.weekNumber,
      weekTitle: week.title,
    })),
  )
  const currentIndex = flat.findIndex((l) => l.slug === lessonSlug)
  if (currentIndex < 0) return null

  return {
    cohort,
    lesson: flat[currentIndex],
    previousLesson: currentIndex > 0 ? flat[currentIndex - 1] : null,
    nextLesson:
      currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null,
  }
}

async function checkAccess(userId: string | undefined, cohortId: string) {
  if (!userId) return { hasAccess: false, requiresAuth: true }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (user?.role === "ADMIN") return { hasAccess: true, requiresAuth: false }
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, cohortId },
  })
  return { hasAccess: !!enrollment, requiresAuth: false }
}

export async function generateMetadata({ params }: PageProps) {
  // The layout 404s when the preview is off; don't query for its title then.
  if (!isDashboardPreviewEnabled()) return {}
  const { cohortNumber: cohortNumberStr, lessonSlug } = await params
  const cohortNumber = parseInt(cohortNumberStr.replace("cohort", ""))
  if (isNaN(cohortNumber)) return { title: "Lesson Not Found" }
  const data = await getCohortLessons(cohortNumber, lessonSlug)
  if (!data) return { title: "Lesson Not Found" }
  return {
    title: `${data.lesson.title} - Cohort ${data.cohort.number} - Botcamp preview`,
  }
}

export default async function CohortLessonPage({ params }: PageProps) {
  const { cohortNumber: cohortNumberStr, lessonSlug } = await params
  const cohortNumber = parseInt(cohortNumberStr.replace("cohort", ""))
  if (isNaN(cohortNumber)) notFound()

  const data = await getCohortLessons(cohortNumber, lessonSlug)
  if (!data) notFound()

  const { cohort, lesson, nextLesson } = data
  const session = await auth()
  const accessCheck = await checkAccess(session?.user?.id, cohort.id)

  // Botcamp marks ARTICLE-type lessons complete just for being opened
  // (markLessonComplete, a database write). This preview only reads, so the
  // lesson keeps the progress last saved in Botcamp.

  const allLessonIds = cohort.weeks.flatMap((w) => w.lessons.map((l) => l.id))
  const progressStatuses = await getLessonProgressStatuses(session?.user?.id, allLessonIds)
  const lessonProgress = (
    await getLessonProgressMap(session?.user?.id, [lesson.id])
  ).get(lesson.id)

  // Cohort live-session metadata is encoded as JSON in lesson.content;
  // parse and split into structured fields when present.
  let sessionInfo: {
    sessionDate?: string
    sessionTime?: string
    description?: string
    slidesURL?: string
  } | null = null
  let displayContent = lesson.content
  if (lesson.content) {
    try {
      const parsed = JSON.parse(lesson.content)
      if (parsed.sessionType || parsed.sessionDate) {
        sessionInfo = {
          sessionDate: parsed.sessionDate,
          sessionTime: parsed.sessionTime,
          description: parsed.description,
          slidesURL: lesson.slidesURL || undefined,
        }
        displayContent = null
      }
    } catch {
      // not JSON — render as markdown
    }
  }
  if (!sessionInfo && lesson.slidesURL) {
    sessionInfo = { slidesURL: lesson.slidesURL }
  }

  const groups: LearnGroup[] = cohort.weeks.map((week) => ({
    id: week.id,
    title: week.title,
    number: week.weekNumber,
    lessons: week.lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      type: l.type,
      duration: l.duration,
      isFree: l.isFree,
      progressStatus: progressStatuses.get(l.id),
    })),
  }))

  const cohortTitle = cohort.title || `Botcamp Cohort ${cohort.number}`
  const overviewPath = `/cohorts/cohort${cohortNumber}`
  const crumbs = [
    { label: cohortTitle, href: overviewPath },
    { label: lesson.title },
  ]

  if (!accessCheck.hasAccess) {
    return (
      <LearnShell
        groups={groups}
        resourceKind="cohort"
        resourceSlug={String(cohort.number)}
        hasAccess={false}
        title={cohortTitle}
        crumbs={crumbs}
      >
        <LessonAccessDenied
          requiresAuth={accessCheck.requiresAuth}
          returnUrl={overviewPath}
          returnLabel="View Cohort Details"
          contextMessage={`This lesson is part of Cohort ${cohortNumber}. You must be enrolled to access this content.`}
        />
      </LearnShell>
    )
  }

  return (
    <LearnShell
      groups={groups}
      resourceKind="cohort"
      resourceSlug={String(cohort.number)}
      hasAccess={accessCheck.hasAccess}
      title={cohortTitle}
      crumbs={crumbs}
    >
      <LessonBody
        title={lesson.title}
        type={lesson.type}
        content={displayContent}
        videoId={lesson.videoId}
        quizData={lesson.quizData}
        transcript={lesson.transcript}
        sessionInfo={sessionInfo}
        lessonId={lesson.id}
        initialPositionSeconds={lessonProgress?.positionSeconds}
        initialCompleted={lessonProgress?.completed}
        learnBasePath={`/cohorts/cohort${cohortNumber}/learn`}
        overviewPath={overviewPath}
        nextLesson={nextLesson}
      />
    </LearnShell>
  )
}
