"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { formatDate } from "@/botcamp/lib/format"
import { Badge } from "@/botcamp/components/ui/badge"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { DataTable, Column } from "@/botcamp/components/ui/data-table"
import { Pencil, ChevronDown, SlidersHorizontal } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/botcamp/components/ui/select"
import { Label } from "@/botcamp/components/ui/label"
import { cn } from "@/botcamp/lib/utils"

type Visibility = "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE"

interface UserRow {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  certified: boolean
  profileVisibility: Visibility
  cohorts: number[]
  hackathons: string[]
  createdAt: string // Serialized as ISO string from server
  _count: {
    enrollments: number
    strategies: number
  }
}

interface Hackathon {
  slug: string
  title: string
}

interface UsersTableProps {
  users: UserRow[]
  hackathons: Hackathon[]
}

export function UsersTable({ users: initialUsers, hackathons }: UsersTableProps) {
  // Local copy so inline-edit dropdowns can update without a full page refresh.
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [certifiedFilter, setCertifiedFilter] = useState<string>("all")
  const [cohortFilter, setCohortFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [hackathonFilter, setHackathonFilter] = useState<string>("all")
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all")
  const [pendingId, setPendingId] = useState<string | null>(null)
  // Mobile-only collapsed state for the filter row.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const activeFilterCount =
    (cohortFilter !== "all" ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0) +
    (certifiedFilter !== "all" ? 1 : 0) +
    (visibilityFilter !== "all" ? 1 : 0) +
    (hackathonFilter !== "all" ? 1 : 0)

  const updateVisibility = async (userId: string, next: Visibility) => {
    const prev = users.find((u) => u.id === userId)?.profileVisibility
    if (!prev || prev === next) return
    // Optimistic update.
    setUsers((rows) =>
      rows.map((r) => (r.id === userId ? { ...r, profileVisibility: next } : r)),
    )
    setPendingId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileVisibility: next }),
      })
      if (!res.ok) throw new Error(`PATCH failed with ${res.status}`)
      toast.success(`Visibility set to ${next}`)
    } catch (err) {
      // Roll back on error.
      setUsers((rows) =>
        rows.map((r) =>
          r.id === userId ? { ...r, profileVisibility: prev } : r,
        ),
      )
      toast.error("Failed to update visibility")
      console.error(err)
    } finally {
      setPendingId(null)
    }
  }

  // Get unique cohort numbers for the filter dropdown
  const cohortNumbers = useMemo(() => {
    const allCohorts = new Set<number>()
    users.forEach((u) => u.cohorts.forEach((c) => allCohorts.add(c)))
    return Array.from(allCohorts).sort((a, b) => b - a) // Descending order
  }, [users])

  // Apply filters
  const filteredUsers = useMemo(() => {
    let result = users

    // Certified filter
    if (certifiedFilter === "certified") {
      result = result.filter((u) => u.certified)
    } else if (certifiedFilter === "not-certified") {
      result = result.filter((u) => !u.certified)
    }

    // Cohort filter
    if (cohortFilter !== "all") {
      const cohortNum = parseInt(cohortFilter, 10)
      result = result.filter((u) => u.cohorts.includes(cohortNum))
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter)
    }

    // Hackathon filter
    if (hackathonFilter !== "all") {
      result = result.filter((u) => u.hackathons.includes(hackathonFilter))
    }

    // Visibility filter
    if (visibilityFilter !== "all") {
      result = result.filter((u) => u.profileVisibility === visibilityFilter)
    }

    return result
  }, [users, certifiedFilter, cohortFilter, roleFilter, hackathonFilter, visibilityFilter])

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: (user) => `${user.firstName || ""} ${user.lastName || ""}`.trim().toLowerCase(),
      searchable: (user) => `${user.firstName || ""} ${user.lastName || ""}`,
      render: (user) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {user.firstName} {user.lastName}
          </span>
          {user.certified && (
            <Badge variant="secondary" className="text-xs">
              Certified
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      searchable: true,
      render: (user) => user.email,
    },
    {
      key: "cohorts",
      header: "Cohorts",
      sortable: (user) => user.cohorts.length,
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.cohorts.length === 0 ? (
            <span className="text-muted-foreground text-sm">—</span>
          ) : (
            user.cohorts.map((cohortNum) => (
              <Badge key={cohortNum} variant="outline" className="text-xs">
                {cohortNum}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: (user) => user.role,
      render: (user) => <StatusBadge value={user.role} type="role" />,
    },
    {
      key: "visibility",
      header: "Visibility",
      sortable: (user) => user.profileVisibility,
      render: (user) => (
        <div
          // The row itself is clickable (rowHref) — stop the row navigation
          // when the admin clicks the dropdown.
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Select
            value={user.profileVisibility}
            onValueChange={(v) => updateVisibility(user.id, v as Visibility)}
            disabled={pendingId === user.id}
          >
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">Public</SelectItem>
              <SelectItem value="PRIVATE">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      key: "enrollments",
      header: "Enrollments",
      sortable: (user) => user._count.enrollments,
      render: (user) => user._count.enrollments,
    },
    {
      key: "strategies",
      header: "Strategies",
      sortable: (user) => user._count.strategies,
      render: (user) => user._count.strategies,
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: (user) => new Date(user.createdAt),
      render: (user) => formatDate(new Date(user.createdAt)),
    },
  ]

  return (
    <div className="space-y-bc-4">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileFiltersOpen((o) => !o)}
        aria-expanded={mobileFiltersOpen}
        className="md:hidden w-full flex items-center justify-between gap-2 rounded-bc-lg border border-border bg-card/70 px-4 py-3 text-sm font-medium hover:border-primary/40 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            mobileFiltersOpen && "rotate-180",
          )}
        />
      </button>
      {/* Filter controls — collapsed on mobile, always visible on md+ */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-4",
          !mobileFiltersOpen && "hidden md:flex",
        )}
      >
        <div className="flex items-center gap-2">
          <Label htmlFor="cohort-filter" className="whitespace-nowrap">
            Cohort:
          </Label>
          <Select value={cohortFilter} onValueChange={setCohortFilter}>
            <SelectTrigger id="cohort-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {cohortNumbers.map((num) => (
                <SelectItem key={num} value={String(num)}>
                  Cohort {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="role-filter" className="whitespace-nowrap">
            Role:
          </Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger id="role-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="certified-filter" className="whitespace-nowrap">
            Certified:
          </Label>
          <Select value={certifiedFilter} onValueChange={setCertifiedFilter}>
            <SelectTrigger id="certified-filter" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="certified">Certified</SelectItem>
              <SelectItem value="not-certified">Not Certified</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="visibility-filter" className="whitespace-nowrap">
            Visibility:
          </Label>
          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger id="visibility-filter" className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PUBLIC">Public</SelectItem>
              <SelectItem value="PRIVATE">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hackathons.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="hackathon-filter" className="whitespace-nowrap">
              Hackathon:
            </Label>
            <Select value={hackathonFilter} onValueChange={setHackathonFilter}>
              <SelectTrigger id="hackathon-filter" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {hackathons.map((h) => (
                  <SelectItem key={h.slug} value={h.slug}>
                    {h.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>

      <DataTable
        data={filteredUsers}
        columns={columns}
        keyField="id"
        searchable
        searchPlaceholder="Search by name or email..."
        defaultSortKey="createdAt"
        defaultSortDirection="desc"
        rowHref={(user) => `/admin/users/${user.id}`}
        actions={[
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            href: (user) => `/admin/users/${user.id}`,
          },
        ]}
        emptyState={{
          icon: "👥",
          title: "No users found",
          description: "Users will appear here once they sign up.",
        }}
      />
    </div>
  )
}
