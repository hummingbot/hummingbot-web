import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { botcampPublicAssetUrl } from "@/botcamp/lib/botcamp-assets"
import { auth } from "@/botcamp/lib/preview-session"
import { calculateTotalDuration } from "@/botcamp/lib/calculations"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { CourseCard } from "@/botcamp/components/courses/CourseCard"
import { getCompletedLessonIds } from "@/botcamp/lib/lesson-progress"
import { BookOpen } from "lucide-react"

export const metadata = {
  title: "My Courses - Dashboard - Botcamp",
}

async function getEnrolledCourses(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      courseId: { not: null },
    },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          thumbnail: true,
          level: true,
          sections: {
            select: {
              lessons: {
                select: {
                  id: true,
                  duration: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  })

  return enrollments.filter((e) => e.course).map((e) => ({
    enrollmentId: e.id,
    enrolledAt: e.enrolledAt,
    course: e.course!,
  }))
}

export default async function DashboardCoursesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  const enrolledCourses = await getEnrolledCourses(session.user.id)

  const allLessonIds = enrolledCourses.flatMap(({ course }) =>
    course.sections.flatMap((s) => s.lessons.map((l) => l.id)),
  )
  const completedLessonIds = await getCompletedLessonIds(session.user.id, allLessonIds)

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Courses"
        description="Courses you're enrolled in"
        variant="admin"
      />

      {enrolledCourses.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={BookOpen}
              title="No courses yet"
              description="Browse our course catalog to start learning."
              action={
                <Button asChild>
                  <Link href="/botcamp#courses">Browse Courses</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.map(({ enrollmentId, course }, index) => {
            const lessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id))
            const totalLessons = lessonIds.length
            const completedCount = lessonIds.filter((id) => completedLessonIds.has(id)).length
            return (
              <CourseCard
                key={enrollmentId}
                slug={course.slug}
                title={course.title}
                level={course.level}
                thumbnail={botcampPublicAssetUrl(course.thumbnail)}
                lessonCount={totalLessons}
                duration={calculateTotalDuration(course.sections)}
                isEnrolled
                href={`/courses/${course.slug}/learn`}
                index={index}
                completedCount={completedCount}
                totalLessons={totalLessons > 0 ? totalLessons : undefined}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
