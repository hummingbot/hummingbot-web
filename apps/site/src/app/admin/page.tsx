import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/botcamp/lib/api-utils"
import { formatDate } from "@/botcamp/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { StatCard, StatCardGrid } from "@/botcamp/components/ui/stat-card"
import { Users, BookOpen, GraduationCap, Lightbulb, ArrowRight } from "lucide-react"

async function getAdminStats() {
  const [
    totalUsers,
    totalCourses,
    totalCohorts,
    totalStrategies,
    recentUsers,
    recentEnrollments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.cohort.count(),
    prisma.strategy.count(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    }),
    prisma.enrollment.findMany({
      take: 5,
      orderBy: { enrolledAt: "desc" },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        course: {
          select: {
            title: true,
          },
        },
        cohort: {
          select: {
            number: true,
            title: true,
          },
        },
      },
    }),
  ])

  return {
    totalUsers,
    totalCourses,
    totalCohorts,
    totalStrategies,
    recentUsers,
    recentEnrollments,
  }
}

export default async function AdminDashboard() {
  // The admin layout also admits INSTRUCTORs (for their courses); this page
  // holds admin-only data, so send anyone else back to their courses.
  if (!(await requireAdmin())) redirect("/admin/courses")

  const stats = await getAdminStats()

  return (
    <div className="space-y-bc-8">
      <PageHeader
        title="Admin Panel"
        description="Overview of your platform"
        variant="admin"
      />

      {/* Stats Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
        />
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={BookOpen}
        />
        <StatCard
          title="Total Cohorts"
          value={stats.totalCohorts}
          icon={GraduationCap}
        />
        <StatCard
          title="Total Strategies"
          value={stats.totalStrategies}
          icon={Lightbulb}
        />
      </StatCardGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest registered users</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/users">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-bc-4">
              {stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              ))}
              {stats.recentUsers.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No users yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Enrollments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Enrollments</CardTitle>
              <CardDescription>Latest course/cohort enrollments</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/enrollments">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-bc-4">
              {stats.recentEnrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {enrollment.user.firstName} {enrollment.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {enrollment.course?.title ||
                        `Cohort ${enrollment.cohort?.number}: ${enrollment.cohort?.title}`}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(enrollment.enrolledAt)}
                  </span>
                </div>
              ))}
              {stats.recentEnrollments.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No enrollments yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
