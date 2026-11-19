"use client"

import Link from "next/link"
import { formatDate } from "@/botcamp/lib/format"
import { Button } from "@/botcamp/components/ui/button"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { DataTable, Column } from "@/botcamp/components/ui/data-table"
import { Pencil, Eye, ClipboardList, Trophy } from "lucide-react"

interface HackathonRow {
  id: string
  slug: string
  title: string
  status: string
  startDate: string
  endDate: string
  registrationStart: string | null
  registrationEnd: string | null
  maxParticipants: number | null
  sessionsCount: number
  winnerName: string | null
  winnerStrategyTitle: string | null
  _count: {
    applications: number
  }
}

interface HackathonsTableProps {
  hackathons: HackathonRow[]
}

export function HackathonsTable({ hackathons }: HackathonsTableProps) {
  const columns: Column<HackathonRow>[] = [
    {
      key: "title",
      header: "Title",
      sortable: (c) => c.title.toLowerCase(),
      searchable: (c) => c.title,
      render: (hackathon) => (
        <span className="font-medium">{hackathon.title}</span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      sortable: (c) => c.slug,
      searchable: (c) => c.slug,
      render: (hackathon) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {hackathon.slug}
        </code>
      ),
    },
    {
      key: "dates",
      header: "Hackathon Dates",
      sortable: (c) => new Date(c.startDate),
      render: (hackathon) => (
        <span className="text-sm">
          {formatDate(new Date(hackathon.startDate))} - {formatDate(new Date(hackathon.endDate))}
        </span>
      ),
    },
    {
      key: "sessions",
      header: "Sessions",
      sortable: (c) => c.sessionsCount,
      render: (hackathon) => hackathon.sessionsCount,
    },
    {
      key: "applications",
      header: "Applications",
      sortable: (c) => c._count.applications,
      render: (hackathon) => (
        <span>
          {hackathon._count.applications}
          {hackathon.maxParticipants && (
            <span className="text-muted-foreground">
              {" "}/ {hackathon.maxParticipants}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: (c) => c.status,
      searchable: (c) => c.status,
      render: (hackathon) => (
        <StatusBadge value={hackathon.status} type="status" />
      ),
    },
    {
      key: "winner",
      header: "Winner",
      sortable: (c) => c.winnerName ?? "",
      searchable: (c) => c.winnerName ?? "",
      render: (hackathon) =>
        hackathon.winnerName ? (
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div>
              <span className="text-sm font-medium">{hackathon.winnerName}</span>
              {hackathon.winnerStrategyTitle && (
                <span className="text-xs text-muted-foreground"> — {hackathon.winnerStrategyTitle}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <DataTable
      data={hackathons}
      columns={columns}
      keyField="id"
      searchable
      searchPlaceholder="Search by title, slug, or status..."
      defaultSortKey="startDate"
      defaultSortDirection="desc"
      actions={[
        {
          label: "View",
          icon: <Eye className="h-4 w-4" />,
          href: (hackathon) => `/hackathons/${hackathon.slug}`,
        },
        {
          label: "Edit",
          icon: <Pencil className="h-4 w-4" />,
          href: (hackathon) => `/admin/hackathons/${hackathon.id}`,
        },
        {
          label: "Applications",
          icon: <ClipboardList className="h-4 w-4" />,
          href: (hackathon) => `/admin/hackathons/${hackathon.id}/applications`,
        },
      ]}
      emptyState={{
        icon: "🏆",
        title: "No past hackathons",
        description: "Completed and archived hackathons will show up here.",
        action: (
          <Button asChild>
            <Link href="/admin/hackathons/new">Create hackathon</Link>
          </Button>
        ),
      }}
    />
  )
}
