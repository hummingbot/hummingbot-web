import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/preview-session"
import { formatDate } from "@/botcamp/lib/format"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { cardStyles } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { GraduationCap, Calendar, Users } from "lucide-react"

export const metadata = {
  title: "My Cohorts - Dashboard - Botcamp",
}

async function getEnrolledCohorts(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      cohortId: { not: null },
    },
    include: {
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
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  })

  return enrollments.filter((e) => e.cohort).map((e) => ({
    enrollmentId: e.id,
    enrolledAt: e.enrolledAt,
    cohort: e.cohort!,
  }))
}

export default async function DashboardCohortsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  const enrolledCohorts = await getEnrolledCohorts(session.user.id)

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Cohorts"
        description="Cohorts you're enrolled in"
        variant="admin"
      />

      {enrolledCohorts.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={GraduationCap}
              title="No cohorts yet"
              description="Check out upcoming cohorts to join one."
              action={
                <Button asChild>
                  <Link href="/botcamp#cohorts">Browse Cohorts</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrolledCohorts.map(({ enrollmentId, cohort }, index) => (
            <Card
              key={enrollmentId}
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
              </CardContent>

              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/cohorts/cohort${cohort.number}/learn`}>
                    View Lessons
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
