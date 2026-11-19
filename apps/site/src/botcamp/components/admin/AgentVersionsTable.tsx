"use client"

import { DataTable, Column } from "@/botcamp/components/ui/data-table"
import { AgentVersionStatusBadge } from "@/botcamp/components/agents/AgentVersionStatusBadge"
import { formatDate } from "@/botcamp/lib/format"

export interface AgentVersionRow {
  id: string
  agent: string
  slug: string
  version: number
  status: string
  source: string
  fileCount: number
  decision: "approve" | "reject" | null
  findingCount: number
  uploader: string
  createdAt: string
}

interface AgentVersionsTableProps {
  versions: AgentVersionRow[]
}

export function AgentVersionsTable({ versions }: AgentVersionsTableProps): React.JSX.Element {
  const columns: Column<AgentVersionRow>[] = [
    {
      key: "agent",
      header: "Agent",
      sortable: (v) => v.agent.toLowerCase(),
      searchable: (v) => `${v.agent} ${v.slug} ${v.uploader}`,
      render: (v) => (
        <div>
          <span className="font-medium">{v.agent}</span>{" "}
          <span className="font-mono text-xs text-muted-foreground">v{v.version}</span>
          <p className="text-xs text-muted-foreground">{v.uploader}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: (v) => v.status,
      render: (v) => <AgentVersionStatusBadge status={v.status} />,
    },
    {
      key: "ai",
      header: "AI Review",
      render: (v) =>
        v.decision ? (
          <span className="text-sm">
            {v.decision === "approve" ? "approved" : "rejected"}
            {v.findingCount > 0 && (
              <span className="text-muted-foreground"> · {v.findingCount} finding{v.findingCount === 1 ? "" : "s"}</span>
            )}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "source",
      header: "Source",
      render: (v) => (
        <span className="font-mono text-xs text-muted-foreground">
          {v.source.toLowerCase()} · {v.fileCount} files
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Uploaded",
      sortable: (v) => v.createdAt,
      render: (v) => <span className="text-sm text-muted-foreground">{formatDate(v.createdAt)}</span>,
    },
  ]

  return (
    <DataTable
      data={versions}
      columns={columns}
      keyField="id"
      searchable
      searchPlaceholder="Search agents or uploaders..."
      rowHref={(v) => `/admin/agents/${v.id}`}
      emptyState={{ icon: "🤖", title: "Nothing here", description: "No agent versions in this state." }}
    />
  )
}
