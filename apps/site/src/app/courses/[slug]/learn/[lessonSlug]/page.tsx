import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { LessonAccessDenied } from "@/botcamp/components/lessons/LessonAccessDenied"
import { LearnShell } from "@/botcamp/components/learn/LearnShell"
import { LessonBody } from "@/botcamp/components/learn/LessonBody"
import type { LearnGroup } from "@/botcamp/components/learn/types"
import { getLessonProgressMap, getLessonProgressStatuses } from "@/botcamp/lib/lesson-progress"
import { auth, isDashboardPreviewEnabled } from "@/botcamp/lib/preview-session"

interface PageProps {
  params: Promise<{ slug: string; lessonSlug: string }>
}

async function getCourseLessons(courseSlug: string, lessonSlug: string) {
  // Fetch course with all sections + lessons (for sidebar) AND the
  // active lesson detail in a single round-trip.
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: {
      id: true,
      slug: true,
      title: true,
      instructorId: true,
      sections: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
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
              videoId: true,
              quizData: true,
            },
          },
        },
      },
    },
  })
  if (!course) return null

  // Flatten to find active + neighbors.
  const flat = course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({ ...lesson, sectionTitle: section.title })),
  )
  const currentIndex = flat.findIndex((l) => l.slug === lessonSlug)
  if (currentIndex < 0) return null

  return {
    course,
    lesson: flat[currentIndex],
    previousLesson: currentIndex > 0 ? flat[currentIndex - 1] : null,
    nextLesson:
      currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null,
  }
}

async function checkAccess(
  userId: string | undefined,
  courseId: string,
  instructorId: string | null,
  isLessonFree: boolean,
) {
  if (isLessonFree) return { hasAccess: true, requiresAuth: false }
  if (!userId) return { hasAccess: false, requiresAuth: true }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (user?.role === "ADMIN") return { hasAccess: true, requiresAuth: false }
  if (user?.role === "INSTRUCTOR" && instructorId === userId)
    return { hasAccess: true, requiresAuth: false }
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  return { hasAccess: !!enrollment, requiresAuth: false }
}

export async function generateMetadata({ params }: PageProps) {
  // The layout 404s when the preview is off; don't query for its title then.
  if (!isDashboardPreviewEnabled()) return {}
  const { slug, lessonSlug } = await params
  const data = await getCourseLessons(slug, lessonSlug)
  if (!data) return { title: "Lesson Not Found" }
  return {
    title: `${data.lesson.title} - ${data.course.title} - Botcamp preview`,
  }
}

export default async function CourseLessonPage({ params }: PageProps) {
  const { slug, lessonSlug } = await params
  const data = await getCourseLessons(slug, lessonSlug)
  if (!data) notFound()

  const { course, lesson, nextLesson } = data
  const session = await auth()

  const accessCheck = await checkAccess(
    session?.user?.id,
    course.id,
    course.instructorId,
    lesson.isFree,
  )
  // Course-level entitlement for the sidebar (free lessons in
  // accessCheck.hasAccess don't imply course access — recompute
  // without the isFree shortcut).
  const courseEntitlement = await checkAccess(
    session?.user?.id,
    course.id,
    course.instructorId,
    false,
  )

  // Botcamp marks ARTICLE-type lessons complete just for being opened
  // (markLessonComplete, a database write). This preview only reads, so the
  // lesson keeps the progress last saved in Botcamp.

  const allLessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id))
  const progressStatuses = await getLessonProgressStatuses(session?.user?.id, allLessonIds)
  const lessonProgress = (
    await getLessonProgressMap(session?.user?.id, [lesson.id])
  ).get(lesson.id)

  const groups: LearnGroup[] = course.sections.map((section) => ({
    id: section.id,
    title: section.title,
    lessons: section.lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      type: l.type,
      duration: l.duration,
      isFree: l.isFree,
      progressStatus: progressStatuses.get(l.id),
    })),
  }))

  const crumbs = [
    { label: course.title, href: `/courses/${course.slug}` },
    { label: lesson.title },
  ]

  if (!accessCheck.hasAccess) {
    return (
      <LearnShell
        groups={groups}
        resourceKind="course"
        resourceSlug={course.slug}
        hasAccess={courseEntitlement.hasAccess}
        title={course.title}
        crumbs={crumbs}
      >
        <LessonAccessDenied
          requiresAuth={accessCheck.requiresAuth}
          returnUrl={`/courses/${slug}`}
          returnLabel="View Course Details"
          contextMessage="This lesson is part of the paid course. Enroll to access all content."
        />
      </LearnShell>
    )
  }

  return (
    <LearnShell
      groups={groups}
      resourceKind="course"
      resourceSlug={course.slug}
      hasAccess={courseEntitlement.hasAccess}
      title={course.title}
      crumbs={crumbs}
    >
      <LessonBody
        title={lesson.title}
        type={lesson.type}
        content={lesson.content}
        videoId={lesson.videoId}
        quizData={lesson.quizData}
        transcript={lesson.transcript}
        lessonId={lesson.id}
        initialPositionSeconds={lessonProgress?.positionSeconds}
        initialCompleted={lessonProgress?.completed}
        learnBasePath={`/courses/${slug}/learn`}
        overviewPath={`/courses/${slug}`}
        nextLesson={nextLesson}
      />
    </LearnShell>
  )
}
