"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  ChevronRight,
  CheckCircle,
  AlertCircle,
  FileCode,
  ExternalLink,
  MoreVertical,
  UserRound,
  Wallet as WalletIcon,
  Star,
} from "lucide-react"
import { Badge } from "@/botcamp/components/ui/badge"
import { Button } from "@/botcamp/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/botcamp/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/botcamp/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/botcamp/components/ui/table"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { applicationStatusColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { formatRelativeTime } from "@/botcamp/lib/format"
import { useApplicationsFilter, type ApplicationsFilterValue } from "./ApplicationsFilterContext"

type ApplicationStatus = "DRAFT" | "FINALIZED" | "REVIEWED"

interface Wallet {
  chain: string
  address: string
}

export interface AdminApplicationRow {
  id: string
  status: ApplicationStatus
  createdAt: string
  user: {
    name: string | null
    firstName: string | null
    lastName: string | null
    email: string
    avatarUrl: string | null
    slug: string | null
    github?: string | null
    linkedin?: string | null
  }
  strategy: {
    id: number
    slug: string
    title: string
    status: string
    strategyType?: string
  } | null
  teamPreferenceNames: string[]
  selectedTeamName: string | null
  /** Average of every admin's individual 1-10 review score, from the Review page */
  avgScore: number | null
  scoreCount: number
  scorers: { adminId: string; adminName: string; score: number }[]
  wallets?: Wallet[]
}

const RANK_FILTER_OPTIONS = [
  { value: "all", label: "All scores" },
  { value: "best", label: "Best ranked" },
  { value: "worst", label: "Worst ranked" },
] as const
type RankFilterValue = (typeof RANK_FILTER_OPTIONS)[number]["value"]

function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

interface AdminApplicationsTableProps {
  applications: AdminApplicationRow[]
  hackathonId: string
  /** Hides the Applied column — used on the main dashboard to keep the
   *  featured hackathon's table scannable; the full detail is still one click
   *  away via Review, and the per-hackathon Applications page shows it. */
  compact?: boolean
}

const TAB_FILTERS = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "FINALIZED", label: "Finalized" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "selected", label: "Selected" },
] as const

function getDisplayName(user: AdminApplicationRow["user"]): string {
  if (user.name) return user.name
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return "Unknown"
}

function getInitials(user: AdminApplicationRow["user"]): string {
  const name = getDisplayName(user)
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function AdminApplicationsTable({
  applications,
  hackathonId,
  compact = false,
}: AdminApplicationsTableProps) {
  const filterCtx = useApplicationsFilter()
  const [localTab, setLocalTab] = useState<ApplicationsFilterValue>("all")
  const activeTab = filterCtx?.filter ?? localTab
  const setActiveTab = (value: string) => {
    const next = value as ApplicationsFilterValue
    if (filterCtx) {
      filterCtx.setFilter(next)
    } else {
      setLocalTab(next)
    }
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      all: applications.length,
      selected: applications.filter((app) => app.selectedTeamName).length,
    }
    for (const app of applications) {
      result[app.status] = (result[app.status] || 0) + 1
    }
    return result
  }, [applications])

  const [rankFilter, setRankFilter] = useState<RankFilterValue>("all")

  const filteredApplications = useMemo(() => {
    const base =
      activeTab === "all"
        ? applications
        : activeTab === "selected"
          ? applications.filter((app) => app.selectedTeamName)
          : applications.filter((app) => app.status === activeTab)

    if (rankFilter === "all") return base

    return [...base].sort((a, b) => {
      if (a.avgScore == null && b.avgScore == null) return 0
      if (a.avgScore == null) return 1
      if (b.avgScore == null) return -1
      return rankFilter === "best" ? b.avgScore - a.avgScore : a.avgScore - b.avgScore
    })
  }, [applications, activeTab, rankFilter])

  if (applications.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="No applications yet"
        description="Applications will appear here once builders apply to this hackathon."
        variant="card"
      />
    )
  }

  return (
    <div className="space-y-bc-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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

        <Select value={rankFilter} onValueChange={(v) => setRankFilter(v as RankFilterValue)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All scores" />
          </SelectTrigger>
          <SelectContent>
            {RANK_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredApplications.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No applications found"
          description={`No ${activeTab === "all" ? "" : activeTab.toLowerCase()} applications to display.`}
          variant="inline"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Strategy Status</TableHead>
              <TableHead>Team Preferences</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              {!compact && <TableHead>Applied</TableHead>}
              <TableHead className="w-[110px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((app) => (
              <TableRow key={app.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={app.user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(app.user)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
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
                      <div className="text-xs text-muted-foreground">{app.user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {app.strategy ? (
                    <div className="space-y-bc-1">
                      <div className="font-medium">{app.strategy.title}</div>
                      {app.strategy.strategyType && (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          {app.strategy.strategyType}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No agent selected</span>
                  )}
                </TableCell>
                <TableCell>
                  {app.strategy ? (
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                      {app.strategy.status}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {app.teamPreferenceNames.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {app.teamPreferenceNames.slice(0, 2).map((name, i) => (
                        <Badge key={name} variant="outline" className="text-xs font-normal text-muted-foreground">
                          {i + 1}. {name}
                        </Badge>
                      ))}
                      {app.teamPreferenceNames.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{app.teamPreferenceNames.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {app.avgScore != null ? (
                    <Badge
                      variant="outline"
                      className="gap-1 font-mono text-xs font-normal"
                      title={app.scorers.map((s) => `${s.adminName}: ${s.score}/10`).join(", ")}
                    >
                      <Star className="h-3 w-3 text-primary" />
                      {app.avgScore}/10
                      <span className="text-muted-foreground">({app.scoreCount})</span>
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {app.status === "FINALIZED" ? (
                      <Badge className="bg-warning text-warning-foreground">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Needs review
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(applicationStatusColors[app.status])}
                      >
                        {app.status}
                      </Badge>
                    )}
                    {app.selectedTeamName && (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {app.selectedTeamName}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {!compact && (
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(app.createdAt)}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/hackathons/${hackathonId}/applications/${app.id}`}>
                        Review
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="px-2">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">More actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {app.strategy && (
                          <DropdownMenuItem asChild>
                            <Link href={`/hub/${app.strategy.slug}`} target="_blank">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View public page
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {app.strategy && (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/strategies/${app.strategy.id}`}>
                              <FileCode className="mr-2 h-4 w-4" />
                              Edit strategy
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {app.user.slug && (
                          <DropdownMenuItem asChild>
                            <Link href={`/builders/${app.user.slug}`} target="_blank">
                              <UserRound className="mr-2 h-4 w-4" />
                              View profile
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {app.wallets && app.wallets.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="flex items-center gap-1.5 font-normal text-muted-foreground">
                              <WalletIcon className="h-3.5 w-3.5" />
                              Wallet
                            </DropdownMenuLabel>
                            {app.wallets.map((w, i) => (
                              <div key={i} className="px-2 py-1 font-mono text-xs">
                                <span className="uppercase text-foreground">{w.chain}</span>{" "}
                                <span className="text-muted-foreground">{truncateAddress(w.address)}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="text-sm text-muted-foreground">
        Showing {filteredApplications.length} of {applications.length} applications
      </p>
    </div>
  )
}
