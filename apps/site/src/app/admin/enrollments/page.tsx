import { prisma } from "@/botcamp/lib/prisma"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/botcamp/lib/api-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { EnrollmentsTable } from "@/botcamp/components/admin/EnrollmentsTable"

export const metadata = {
  title: "Enrollments - Admin - Botcamp",
}

async function getEnrollments() {
  const enrollments = await prisma.enrollment.findMany({
    orderBy: { enrolledAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      cohort: {
        select: {
          id: true,
          number: true,
          title: true,
        },
      },
    },
  })

  // Serialize dates for client component
  return enrollments.map((enrollment) => ({
    ...enrollment,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  }))
}

export default async function AdminEnrollmentsPage() {
  // The admin layout also admits INSTRUCTORs (for their courses); this page
  // holds admin-only data, so send anyone else back to their courses.
  if (!(await requireAdmin())) redirect("/admin/courses")

  const enrollments = await getEnrollments()

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Enrollments"
        description="View all course and cohort enrollments"
        variant="admin"
      />

      <Card>
        <CardHeader>
          <CardTitle>All Enrollments ({enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentsTable enrollments={enrollments} />
        </CardContent>
      </Card>
    </div>
  )
}
