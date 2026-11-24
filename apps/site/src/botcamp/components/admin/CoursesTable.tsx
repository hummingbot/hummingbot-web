"use client"

import Link from "next/link"
import { formatPriceCents } from "@/botcamp/lib/format"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { DataTable, Column } from "@/botcamp/components/ui/data-table"
import { Pencil, Eye } from "lucide-react"

interface Instructor {
  id: string
  name: string | null
  email: string
}

interface CourseRow {
  id: string
  slug: string
  title: string
  level: string
  price: number
  published: boolean
  lessonCount: number
  instructor?: Instructor | null
  _count: {
    enrollments: number
  }
}

interface CoursesTableProps {
  courses: CourseRow[]
  showInstructor?: boolean
}

export function CoursesTable({ courses, showInstructor = false }: CoursesTableProps) {
  const columns: Column<CourseRow>[] = [
    {
      key: "title",
      header: "Title",
      sortable: (c) => c.title.toLowerCase(),
      searchable: (c) => c.title,
      render: (course) => (
        <div>
          <span className="font-medium">{course.title}</span>
          <p className="text-xs text-muted-foreground">/{course.slug}</p>
        </div>
      ),
    },
    ...(showInstructor ? [{
      key: "instructor",
      header: "Instructor",
      sortable: (c: CourseRow) => c.instructor?.name?.toLowerCase() || c.instructor?.email || "",
      render: (course: CourseRow) => (
        <span className="text-sm">
          {course.instructor?.name || course.instructor?.email || (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    }] : []),
    {
      key: "level",
      header: "Level",
      sortable: (c) => c.level,
      render: (course) => <StatusBadge value={course.level} type="level" />,
    },
    {
      key: "lessons",
      header: "Lessons",
      sortable: (c) => c.lessonCount,
      render: (course) => course.lessonCount,
    },
    {
      key: "enrollments",
      header: "Enrollments",
      sortable: (c) => c._count.enrollments,
      render: (course) => course._count.enrollments,
    },
    {
      key: "price",
      header: "Price",
      sortable: (c) => c.price,
      render: (course) => formatPriceCents(course.price),
    },
    {
      key: "status",
      header: "Status",
      sortable: (c) => (c.published ? "Published" : "Draft"),
      render: (course) => (
        <Badge variant={course.published ? "default" : "secondary"}>
          {course.published ? "Published" : "Draft"}
        </Badge>
      ),
    },
  ]

  return (
    <DataTable
      data={courses}
      columns={columns}
      keyField="id"
      searchable
      searchPlaceholder="Search by title..."
      actions={[
        {
          label: "View",
          icon: <Eye className="h-4 w-4" />,
          href: (course) => `/courses/${course.slug}`,
        },
        {
          label: "Edit",
          icon: <Pencil className="h-4 w-4" />,
          href: (course) => `/admin/courses/${course.id}`,
        },
      ]}
      emptyState={{
        icon: "📚",
        title: "No courses found",
        description: "Create your first course to get started.",
        action: (
          <Button asChild>
            <Link href="/admin/courses/new">Create first course</Link>
          </Button>
        ),
      }}
    />
  )
}
