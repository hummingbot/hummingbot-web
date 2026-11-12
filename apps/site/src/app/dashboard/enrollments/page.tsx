import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/preview-session"
import { formatDate, formatDuration } from "@/botcamp/lib/format"
import { calculateTotalLessons, calculateTotalDuration } from "@/botcamp/lib/calculations"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { LessonProgressBar } from "@/botcamp/components/learn/LessonProgressBar"
import { cardStyles } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { BUNDLE_PRICE_CENTS, getPendingBundleDeposit } from "@/botcamp/lib/bundle"
import { getCompletedLessonIds } from "@/botcamp/lib/lesson-progress"
import { BookOpen, GraduationCap, Calendar, Users, Clock, PiggyBank } from "lucide-react"

export const metadata = {
  title: "Learning - Dashboard - Hummingbot",
}

async function getEnrollments(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
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
      cohort: {
        select: {
          id: true,
          slug: true,
          number: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          _count: {
            select: {
              enrollments: true,
            },
          },
          weeks: {
            select: {
              lessons: { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  })

  return enrollments
}

async function getBundleDeposit(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { bundleDepositCohortNumber: true, bundleDepositAt: true },
  })
}

export default async function DashboardEnrollmentsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  const [enrollments, user] = await Promise.all([
    getEnrollments(session.user.id),
    getBundleDeposit(session.user.id),
  ])

  const courseEnrollments = enrollments.filter((e) => e.course)
  const cohortEnrollments = enrollments.filter((e) => e.cohort)

  const allLessonIds = enrollments.flatMap((e) => [
    ...(e.course?.sections.flatMap((s) => s.lessons.map((l) => l.id)) ?? []),
    ...(e.cohort?.weeks.flatMap((w) => w.lessons.map((l) => l.id)) ?? []),
  ])
  const completedLessonIds = await getCompletedLessonIds(session.user.id, allLessonIds)
  const bundleDeposit = getPendingBundleDeposit(
    user,
    cohortEnrollments.map((e) => e.cohort!.number),
  )
  const hasAnyEnrollment = enrollments.length > 0 || !!bundleDeposit

  return (
    <div className="space-y-bc-8">
      <PageHeader
        title="Learning"
        description="Your courses and cohort memberships"
        variant="admin"
      />

      {!hasAnyEnrollment ? (
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
      ) : (
        <>
          {/* Cohort Enrollments */}
          {(cohortEnrollments.length > 0 || bundleDeposit) && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  Cohorts ({cohortEnrollments.length + (bundleDeposit ? 1 : 0)})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bundleDeposit && (
                  <Card className="shadow-none border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-bc-lg bg-primary/10 flex items-center justify-center">
                            <PiggyBank className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              Cohort {bundleDeposit.cohortNumber}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              ${(BUNDLE_PRICE_CENTS / 100).toFixed(0)} deposit paid
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-primary border border-primary/30 rounded px-2 py-1">
                          Deposit
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Paid {formatDate(bundleDeposit.depositedAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        Applied in full toward tuition once Cohort {bundleDeposit.cohortNumber} enrollment opens.
                      </p>
                    </CardContent>
                  </Card>
                )}
                {cohortEnrollments.map((enrollment, index) => {
                  const cohort = enrollment.cohort!
                  const lessons = cohort.weeks.flatMap((week) => week.lessons)
                  const completedCount = lessons.filter((l) => completedLessonIds.has(l.id)).length
                  const totalLessons = lessons.length
                  return (
                    <Card
                      key={enrollment.id}
                      className={cn(cardStyles.hover, cardStyles.enter)}
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-bc-lg bg-primary/10 flex items-center justify-center">
                              <GraduationCap className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                Cohort {cohort.number}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {cohort.title}
                              </p>
                            </div>
                          </div>
                          <StatusBadge value={cohort.status} type="status" />
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-bc-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(cohort.startDate)} - {formatDate(cohort.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{cohort._count.enrollments} members</span>
                        </div>
                        <LessonProgressBar completedCount={completedCount} totalLessons={totalLessons} />
                      </CardContent>

                      <CardFooter>
                        <Button asChild className="w-full">
                          <Link href={`/cohorts/cohort${cohort.number}/learn`}>
                            View Lessons
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {/* Course Enrollments */}
          {courseEnrollments.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Courses ({courseEnrollments.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courseEnrollments.map((enrollment, index) => {
                  const course = enrollment.course!
                  const totalLessons = calculateTotalLessons(course.sections)
                  const totalDuration = calculateTotalDuration(course.sections)
                  const lessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id))
                  const completedCount = lessonIds.filter((id) => completedLessonIds.has(id)).length

                  return (
                    <Card
                      key={enrollment.id}
                      className={cn(cardStyles.hover, cardStyles.enter)}
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-bc-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {course.title}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {course.description ? course.description.slice(0, 60) + (course.description.length > 60 ? '...' : '') : 'Online course'}
                              </p>
                            </div>
                          </div>
                          <StatusBadge value={course.level} type="level" />
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-bc-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>{totalLessons} lessons</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(totalDuration)}</span>
                          </div>
                        </div>
                        <LessonProgressBar completedCount={completedCount} totalLessons={totalLessons} />
                      </CardContent>

                      <CardFooter>
                        <Button asChild className="w-full">
                          <Link href={`/courses/${course.slug}/learn`}>
                            {completedCount === 0 ? "Start Learning" : "Continue Learning"}
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
