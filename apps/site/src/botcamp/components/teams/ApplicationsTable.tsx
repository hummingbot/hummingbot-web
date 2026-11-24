"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronRight, Star, CheckCircle } from "lucide-react"
import { Badge } from "@/botcamp/components/ui/badge"
import { Button } from "@/botcamp/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/botcamp/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/botcamp/components/ui/table"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { applicationStatusColors, strategyTypeColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { formatRelativeTime } from "@/botcamp/lib/format"

type ApplicationStatus = "DRAFT" | "FINALIZED" | "REVIEWED"

interface Application {
  id: string
  status: ApplicationStatus
  teamPreferences: string[]
  preferenceRank: number
  isSelectedByThisTeam: boolean
  scoreSummary: { average: number | null; count: number }
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
    slug: string | null
  }
  strategy: {
    id: number
    title: string
    slug: string
    strategyType: string
    updatedAt: string
  } | null
}

interface ApplicationsTableProps {
  applications: Application[]
  /** Base path of the team administration view, e.g. "/dashboard/team" or "/admin/teams/<id>". */
  basePath: string
}

const TAB_FILTERS = [
  { value: "all", label: "All" },
  { value: "FINALIZED", label: "Finalized" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "selected", label: "Selected" },
] as const

function getDisplayName(user: Application["user"]): string {
  if (user.name) return user.name
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return "Unknown"
}

function getInitials(user: Application["user"]): string {
  const name = getDisplayName(user)
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function ApplicationsTable({ applications, basePath }: ApplicationsTableProps) {
  const [activeTab, setActiveTab] = useState<string>("all")

  // Count applications per status
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: applications.length }
    for (const app of applications) {
      result[app.status] = (result[app.status] || 0) + 1
      if (app.isSelectedByThisTeam) {
        result.selected = (result.selected || 0) + 1
      }
    }
    return result
  }, [applications])

  // Filter applications based on active tab
  const filteredApplications = useMemo(() => {
    if (activeTab === "all") return applications
    if (activeTab === "selected") {
      return applications.filter((app) => app.isSelectedByThisTeam)
    }
    return applications.filter((app) => app.status === activeTab)
  }, [applications, activeTab])

  if (applications.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="No applications yet"
        description="Applications will appear here when users include your team in their preferences."
        variant="card"
      />
    )
  }

  return (
    <div className="space-y-bc-4">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TAB_FILTERS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({counts[tab.value] || 0})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      {filteredApplications.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No applications found"
          description={`No ${activeTab === "selected" ? "selected" : activeTab.toLowerCase()} applications to display.`}
          variant="inline"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((app) => (
              <TableRow key={app.id} className="hover:bg-muted/50">
                <TableCell>
                  {app.strategy ? (
                    <div>
                      <div className="font-medium">{app.strategy.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            strategyTypeColors[app.strategy.strategyType] ||
                              strategyTypeColors.OTHER
                          )}
                        >
                          {app.strategy.strategyType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Updated {formatRelativeTime(app.strategy.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No agent selected</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={app.user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(app.user)}
                      </AvatarFallback>
                    </Avatar>
                    {app.user.slug ? (
                      <Link
                        href={`/builders/${app.user.slug}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {getDisplayName(app.user)}
                      </Link>
                    ) : (
                      <span className="font-medium">{getDisplayName(app.user)}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="font-medium">#{app.preferenceRank}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {app.scoreSummary.average != null ? (
                    <span className="font-medium">{app.scoreSummary.average}/10</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(applicationStatusColors[app.status])}
                    >
                      {app.status}
                    </Badge>
                    {app.isSelectedByThisTeam && (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(app.createdAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`${basePath}/applications/${app.id}`}>
                      Review
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredApplications.length} of {applications.length} applications
      </p>
    </div>
  )
}
