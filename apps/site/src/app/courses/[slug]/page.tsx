import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth, isDashboardPreviewEnabled } from "@/botcamp/lib/preview-session"
import { botcampPublicAssetUrl } from "@/botcamp/lib/botcamp-assets"
import { formatDuration, formatPriceCents } from "@/botcamp/lib/format"
import { calculateTotalLessons, calculateTotalDuration } from "@/botcamp/lib/calculations"
import { LearnShell } from "@/botcamp/components/learn/LearnShell"
import { CourseHero, heroStatIcons } from "@/botcamp/components/learn/CourseHero"
import { FreeEnrollButton } from "@/botcamp/components/learn/FreeEnrollButton"
import { SectionList } from "@/botcamp/components/learn/SectionList"
import type { LearnGroup } from "@/botcamp/components/learn/types"
import { getLessonProgressStatuses, resolveResumeLesson } from "@/botcamp/lib/lesson-progress"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getCourse(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
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
      _count: { select: { enrollments: true } },
    },
  })
}

async function checkEnrollment(userId: string | undefined, courseId: string) {
  if (!userId) return false
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  return !!enrollment
}

async function getUserRole(userId: string | undefined) {
  if (!userId) return null
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role ?? null
}

export async function generateMetadata({ params }: PageProps) {
  // The layout 404s when the preview is off; don't query for its title then.
  if (!isDashboardPreviewEnabled()) return {}
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) return { title: "Course Not Found" }
  return {
    title: `${course.title} - Botcamp preview`,
    description: course.description || `Learn ${course.title} with Botcamp`,
  }
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) notFound()

  const session = await auth()
  const userRole = await getUserRole(session?.user?.id)
  const isAdmin = userRole === "ADMIN"
  const isInstructor =
    userRole === "INSTRUCTOR" && course.instructorId === session?.user?.id

  if (!course.published && !isAdmin && !isInstructor) notFound()

  const isEnrolled = await checkEnrollment(session?.user?.id, course.id)
  const hasAccess = isEnrolled || isAdmin || isInstructor

  const totalLessons = calculateTotalLessons(course.sections)
  const totalDuration = calculateTotalDuration(course.sections)

  const allLessons = course.sections.flatMap((section) => section.lessons)
  const progressStatuses = await getLessonProgressStatuses(
    session?.user?.id,
    allLessons.map((l) => l.id),
  )
  const completedLessonIds = new Set(
    [...progressStatuses].filter(([, status]) => status === "completed").map(([id]) => id),
  )

  // Shape the sections into the shared LearnGroup format. We carry over a
  // light description per section if one exists (Section model doesn't
  // store one today; leave undefined).
  const groups: LearnGroup[] = course.sections.map((section) => ({
    id: section.id,
    title: section.title,
    lessons: section.lessons.map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      type: lesson.type,
      duration: lesson.duration,
      isFree: lesson.isFree,
      progressStatus: progressStatuses.get(lesson.id),
    })),
  }))

  const firstLesson = course.sections[0]?.lessons[0]
  const resumeLesson = isEnrolled
    ? resolveResumeLesson(allLessons, completedLessonIds)
    : firstLesson
  const learnHref = resumeLesson
    ? `/courses/${slug}/learn/${resumeLesson.slug}`
    : `/courses/${slug}/learn`

  // Stats row — modules · lessons · duration.
  const stats = [
    { icon: heroStatIcons.modules, label: `${course.sections.length} parts` },
    { icon: heroStatIcons.lessons, label: `${totalLessons} lessons` },
    { icon: heroStatIcons.duration, label: formatDuration(totalDuration) },
  ]

  return (
    <LearnShell
      groups={groups}
      resourceKind="course"
      resourceSlug={course.slug}
      hasAccess={hasAccess}
      initialCollapsed
      title={course.title}
      crumbs={[
        { label: "Courses", href: "/botcamp#courses" },
        { label: course.title },
      ]}
    >
      <CourseHero
        title={course.title}
        description={course.description}
        thumbnail={botcampPublicAssetUrl(course.thumbnail)}
        level={course.level}
        stats={stats}
        progress={
          isEnrolled ? { completedCount: completedLessonIds.size, totalLessons } : undefined
        }
        cta={
          hasAccess
            ? {
                label:
                  isEnrolled && completedLessonIds.size > 0
                    ? "Continue learning"
                    : "Start the course",
                href: learnHref,
              }
            : course.price === 0
              ? { label: "Enroll for free" }
              : { label: `Enroll · ${formatPriceCents(course.price)}` }
        }
        ctaSlot={
          !hasAccess ? (
            <FreeEnrollButton price={course.price} />
          ) : undefined
        }
      />

      <SectionList
        groups={groups}
        resourceKind="course"
        resourceSlug={course.slug}
        hasAccess={hasAccess}
      />

      {/* Botcamp also shows its cohort-deposit upsell (CohortDepositBanner)
          to viewers without access here; that's a checkout flow, so the
          read-only preview leaves it out. */}
    </LearnShell>
  )
}
