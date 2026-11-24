"use client"

import Link from "next/link"
import { formatDate } from "@/botcamp/lib/format"
import { Badge } from "@/botcamp/components/ui/badge"
import { DataTable, Column } from "@/botcamp/components/ui/data-table"
import { Eye } from "lucide-react"

interface EnrollmentRow {
  id: string
  enrolledAt: string
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  course: {
    id: string
    title: string
    slug: string
  } | null
  cohort: {
    id: string
    number: number
    title: string | null
  } | null
}

interface EnrollmentsTableProps {
  enrollments: EnrollmentRow[]
}

export function EnrollmentsTable({ enrollments }: EnrollmentsTableProps) {
  const columns: Column<EnrollmentRow>[] = [
    {
      key: "user",
      header: "User",
      sortable: (e) => `${e.user.firstName || ""} ${e.user.lastName || ""}`.trim().toLowerCase(),
      searchable: (e) => `${e.user.firstName || ""} ${e.user.lastName || ""} ${e.user.email}`,
      render: (enrollment) => (
        <div>
          <Link
            href={`/admin/users/${enrollment.user.id}`}
            className="font-medium hover:underline"
          >
            {enrollment.user.firstName} {enrollment.user.lastName}
          </Link>
          <p className="text-sm text-muted-foreground">{enrollment.user.email}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: (e) => (e.course ? "Course" : "Cohort"),
      searchable: (e) => (e.course ? "Course" : "Cohort"),
      render: (enrollment) => (
        <Badge variant={enrollment.course ? "default" : "secondary"}>
          {enrollment.course ? "Course" : "Cohort"}
        </Badge>
      ),
    },
    {
      key: "item",
      header: "Course / Cohort",
      sortable: (e) => e.course?.title || e.cohort?.title || "",
      searchable: (e) => e.course?.title || `Cohort ${e.cohort?.number}: ${e.cohort?.title}` || "",
      render: (enrollment) => {
        if (enrollment.course) {
          return (
            <Link
              href={`/admin/courses/${enrollment.course.id}`}
              className="hover:underline"
            >
              {enrollment.course.title}
            </Link>
          )
        }
        if (enrollment.cohort) {
          return (
            <Link
              href={`/admin/cohorts/${enrollment.cohort.id}`}
              className="hover:underline"
            >
              Cohort {enrollment.cohort.number}: {enrollment.cohort.title}
            </Link>
          )
        }
        return <span className="text-muted-foreground">—</span>
      },
    },
    {
      key: "enrolledAt",
      header: "Enrolled",
      sortable: (e) => new Date(e.enrolledAt),
      render: (enrollment) => formatDate(new Date(enrollment.enrolledAt)),
    },
  ]

  return (
    <DataTable
      data={enrollments}
      columns={columns}
      keyField="id"
      searchable
      searchPlaceholder="Search by user, course, or cohort..."
      defaultSortKey="enrolledAt"
      defaultSortDirection="desc"
      actions={[
        {
          label: "View User",
          icon: <Eye className="h-4 w-4" />,
          href: (enrollment) => `/admin/users/${enrollment.user.id}`,
        },
      ]}
      emptyState={{
        icon: "📋",
        title: "No enrollments found",
        description: "Enrollments will appear here once users enroll in courses or cohorts.",
      }}
    />
  )
}
