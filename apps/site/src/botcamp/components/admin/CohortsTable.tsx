"use client"

import Link from "next/link"
import { formatDate } from "@/botcamp/lib/format"
import { Button } from "@/botcamp/components/ui/button"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { DataTable, Column } from "@/botcamp/components/ui/data-table"
import { Pencil, Eye } from "lucide-react"

interface CohortRow {
  id: string
  number: number
  title: string | null
  status: string
  startDate: string // Serialized as ISO string
  endDate: string   // Serialized as ISO string
  weeksCount: number
  _count: {
    enrollments: number
  }
}

interface CohortsTableProps {
  cohorts: CohortRow[]
}

export function CohortsTable({ cohorts }: CohortsTableProps) {
  const columns: Column<CohortRow>[] = [
    {
      key: "number",
      header: "Cohort",
      sortable: (c) => c.number,
      searchable: (c) => `Cohort ${c.number}`,
      render: (cohort) => (
        <span className="font-medium">Cohort {cohort.number}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: (c) => c.title?.toLowerCase() || "",
      searchable: (c) => c.title || "",
      render: (cohort) => cohort.title || "-",
    },
    {
      key: "dates",
      header: "Dates",
      sortable: (c) => new Date(c.startDate),
      render: (cohort) => (
        <span className="text-sm">
          {formatDate(new Date(cohort.startDate))} - {formatDate(new Date(cohort.endDate))}
        </span>
      ),
    },
    {
      key: "weeks",
      header: "Weeks",
      sortable: (c) => c.weeksCount,
      render: (cohort) => cohort.weeksCount,
    },
    {
      key: "members",
      header: "Members",
      sortable: (c) => c._count.enrollments,
      render: (cohort) => cohort._count.enrollments,
    },
    {
      key: "status",
      header: "Status",
      sortable: (c) => c.status,
      searchable: (c) => c.status,
      render: (cohort) => <StatusBadge value={cohort.status} type="status" />,
    },
  ]

  return (
    <DataTable
      data={cohorts}
      columns={columns}
      keyField="id"
      searchable
      searchPlaceholder="Search by cohort number, title, or status..."
      defaultSortKey="number"
      defaultSortDirection="desc"
      actions={[
        {
          label: "View",
          icon: <Eye className="h-4 w-4" />,
          href: (cohort) => `/cohorts/cohort${cohort.number}`,
        },
        {
          label: "Edit",
          icon: <Pencil className="h-4 w-4" />,
          href: (cohort) => `/admin/cohorts/${cohort.id}`,
        },
      ]}
      emptyState={{
        icon: "📅",
        title: "No cohorts found",
        description: "Create your first cohort to get started.",
        action: (
          <Button asChild>
            <Link href="/admin/cohorts/new">Create first cohort</Link>
          </Button>
        ),
      }}
    />
  )
}
