import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/botcamp/lib/api-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { CohortsTable } from "@/botcamp/components/admin/CohortsTable"
import { Plus } from "lucide-react"

export const metadata = {
  title: "Cohorts - Admin - Botcamp",
}

async function getCohorts() {
  const cohorts = await prisma.cohort.findMany({
    orderBy: { number: "desc" },
    include: {
      weeks: {
        select: { id: true },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  })

  // Serialize dates for client component
  return cohorts.map((cohort) => ({
    id: cohort.id,
    number: cohort.number,
    title: cohort.title,
    status: cohort.status,
    startDate: cohort.startDate.toISOString(),
    endDate: cohort.endDate.toISOString(),
    weeksCount: cohort.weeks.length,
    _count: cohort._count,
  }))
}

export default async function AdminCohortsPage() {
  // The admin layout also admits INSTRUCTORs (for their courses); this page
  // holds admin-only data, so send anyone else back to their courses.
  if (!(await requireAdmin())) redirect("/admin/courses")

  const cohorts = await getCohorts()

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Cohorts"
        description="Manage Botcamp cohorts"
        variant="admin"
        actions={
          <Button asChild>
            <Link href="/admin/cohorts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Cohort
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Cohorts ({cohorts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <CohortsTable cohorts={cohorts} />
        </CardContent>
      </Card>
    </div>
  )
}
