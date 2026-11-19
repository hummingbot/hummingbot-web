"use client"

import Link from "next/link"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { DataTable, Column } from "@/botcamp/components/ui/data-table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/botcamp/components/ui/tooltip"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { SlidersHorizontal, ExternalLink, Users } from "lucide-react"

interface TeamRow {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  logoUrlDark: string | null
  websiteUrl: string | null
  sortOrder: number
  membersCount: number
  createdAt: string
  /** Ranked/selected counts for the currently-featured hackathon — null for a
   *  team not sponsoring it (e.g. one that only sponsored a past edition). */
  currentApplicants: number | null
  currentApplicantNames: string[]
  currentSelected: number | null
  currentMaxSelections: number | null
  currentSelectedNames: string[]
}

interface TeamsTableProps {
  teams: TeamRow[]
}

export function TeamsTable({ teams }: TeamsTableProps) {
  const columns: Column<TeamRow>[] = [
    {
      key: "name",
      header: "Team",
      sortable: (t) => t.name.toLowerCase(),
      searchable: (t) => `${t.name} ${t.slug} ${t.description || ""}`,
      render: (team) => (
        <div className="flex items-center gap-3">
          <TeamLogoBadge
            logoUrl={team.logoUrl}
            logoUrlDark={team.logoUrlDark}
            alt={team.name}
            className="h-8 w-8 rounded-full shrink-0"
            imageSize={20}
            fallback={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <div>
            <Link href={`/admin/teams/${team.id}`} className="font-medium hover:text-primary hover:underline">
              {team.name}
            </Link>
            <p className="text-xs text-muted-foreground">{team.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "applicants",
      header: "Applicants",
      sortable: (t) => t.currentApplicants ?? -1,
      render: (team) => {
        if (team.currentApplicants === null) {
          return <span className="text-muted-foreground">—</span>
        }
        const label = (
          <span>
            {team.currentApplicants} applicant{team.currentApplicants === 1 ? "" : "s"}
          </span>
        )
        if (team.currentApplicantNames.length === 0) return label
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{label}</span>
            </TooltipTrigger>
            <TooltipContent>{team.currentApplicantNames.join(", ")}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      key: "selected",
      header: "Selected",
      sortable: (t) => t.currentSelected ?? -1,
      render: (team) => {
        if (team.currentSelected === null || team.currentMaxSelections === null) {
          return <span className="text-muted-foreground">—</span>
        }
        const full = team.currentSelected >= team.currentMaxSelections
        const badge = (
          <Badge variant="outline" className={full ? "bg-success/10 text-success border-success/20" : ""}>
            {team.currentSelected} / {team.currentMaxSelections}
            {full && " · Full"}
          </Badge>
        )
        if (team.currentSelectedNames.length === 0) return badge
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">{badge}</span>
            </TooltipTrigger>
            <TooltipContent>{team.currentSelectedNames.join(", ")}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      key: "members",
      header: "Members",
      sortable: (t) => t.membersCount,
      render: (team) => (
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          {team.membersCount}
        </span>
      ),
    },
    {
      key: "website",
      header: "Website",
      render: (team) =>
        team.websiteUrl ? (
          <a
            href={team.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Link
          </a>
        ) : (
          "-"
        ),
    },
  ]

  return (
    <TooltipProvider delayDuration={150}>
      <DataTable
        data={teams}
        columns={columns}
        keyField="id"
        searchable
        searchPlaceholder="Search by team name, slug, or description..."
        defaultSortKey="applicants"
        defaultSortDirection="desc"
        actions={[
          {
            label: "Manage",
            icon: <SlidersHorizontal className="h-4 w-4" />,
            href: (team) => `/admin/teams/${team.id}`,
          },
        ]}
        emptyState={{
          icon: "team",
          title: "No teams found",
          description: "Create your first team to get started.",
          action: (
            <Button asChild>
              <Link href="/admin/teams/new">Create first team</Link>
            </Button>
          ),
        }}
      />
    </TooltipProvider>
  )
}
