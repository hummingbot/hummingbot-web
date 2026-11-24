"use client"

import Link from "next/link"
import { formatDate } from "@/botcamp/lib/format"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { DataTable, Column } from "@/botcamp/components/ui/data-table"
import { strategyStatusColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { Plus, Eye, Pencil, Download } from "lucide-react"

interface StrategyRow {
  id: number
  slug: string
  title: string
  status: string
  tags: string[]
  createdAt: string // Serialized as ISO string
  cohortNumber: number | null
  authorNames: string[]
}

interface StrategiesTableProps {
  strategies: StrategyRow[]
}

export function StrategiesTable({ strategies }: StrategiesTableProps) {
  const handleDownload = (strategy: StrategyRow) => {
    // Filename is provided by the server's Content-Disposition (sanitized title).
    const a = document.createElement("a")
    a.href = `/api/admin/strategies/${strategy.id}/download`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const columns: Column<StrategyRow>[] = [
    {
      key: "title",
      header: "Title",
      sortable: (s) => s.title.toLowerCase(),
      searchable: (s) => `${s.title} ${s.slug}`,
      render: (strategy) => (
        <div>
          <span className="font-medium">{strategy.title}</span>
          <p className="text-xs text-muted-foreground">/{strategy.slug}</p>
        </div>
      ),
    },
    {
      key: "authors",
      header: "Authors",
      sortable: (s) => s.authorNames.join(", ").toLowerCase(),
      searchable: (s) => s.authorNames.join(" "),
      render: (strategy) =>
        strategy.authorNames.length > 0 ? (
          <span>{strategy.authorNames.join(", ")}</span>
        ) : (
          <span className="text-muted-foreground">No authors</span>
        ),
    },
    {
      key: "cohort",
      header: "Cohort",
      sortable: (s) => s.cohortNumber,
      searchable: (s) =>
        s.cohortNumber === 0
          ? "Example"
          : s.cohortNumber
            ? `Cohort ${s.cohortNumber}`
            : "No cohort",
      render: (strategy) => (
        strategy.cohortNumber !== null ? (
          <Badge variant="outline">
            {strategy.cohortNumber === 0 ? "Example" : `Cohort ${strategy.cohortNumber}`}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: (s) => s.status,
      searchable: (s) => s.status,
      render: (strategy) => {
        const config = strategyStatusColors[strategy.status]
        return (
          <Badge
            variant="outline"
            className={cn(
              config?.bg,
              config?.iconColor,
              config?.border
            )}
          >
            {strategy.status}
          </Badge>
        )
      },
    },
    {
      key: "tags",
      header: "Tags",
      searchable: (s) => s.tags.join(" "),
      render: (strategy) => (
        <div className="flex flex-wrap gap-1">
          {strategy.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {strategy.tags.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{strategy.tags.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: (s) => new Date(s.createdAt),
      render: (strategy) => formatDate(new Date(strategy.createdAt)),
    },
  ]

  return (
    <DataTable
      data={strategies}
      columns={columns}
      keyField="id"
      searchable
      searchPlaceholder="Search by title, author, cohort, status, or tags..."
      defaultSortKey="createdAt"
      defaultSortDirection="desc"
      actions={[
        {
          label: "View",
          icon: <Eye className="h-4 w-4" />,
          href: (strategy) => `/hub/${strategy.slug}`,
        },
        {
          label: "Edit",
          icon: <Pencil className="h-4 w-4" />,
          href: (strategy) => `/admin/strategies/${strategy.id}`,
        },
        {
          label: "Download ZIP",
          icon: <Download className="h-4 w-4" />,
          onClick: handleDownload,
        },
      ]}
      emptyState={{
        icon: "📭",
        title: "No strategies found",
        description: "Create your first strategy to get started.",
        action: (
          <Button asChild>
            <Link href="/admin/strategies/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Strategy
            </Link>
          </Button>
        ),
      }}
    />
  )
}
