"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/botcamp/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/botcamp/components/ui/table"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Eye, Pencil, Trash2, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/botcamp/components/ui/dropdown-menu"
import Link from "next/link"
import { EmptyState } from "./empty-state"

export interface Column<T> {
  key: string
  header: string
  className?: string
  render?: (item: T) => React.ReactNode
  /** Enable sorting for this column. Provide a function to extract sortable value. */
  sortable?: boolean | ((item: T) => string | number | Date | null | undefined)
  /** Fields to include in text search for this column */
  searchable?: boolean | ((item: T) => string)
}

export interface RowAction<T> {
  label: string
  icon?: React.ReactNode
  href?: string | ((item: T) => string)
  onClick?: (item: T) => void
  variant?: "default" | "destructive"
  show?: (item: T) => boolean
}

type SortDirection = "asc" | "desc" | null

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  actions?: RowAction<T>[]
  emptyState?: {
    icon?: string
    title: string
    description?: string
    action?: React.ReactNode
  }
  isLoading?: boolean
  className?: string
  actionsPosition?: "inline" | "dropdown"
  /** Show search/filter input */
  searchable?: boolean
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Default sort column key */
  defaultSortKey?: string
  /** Default sort direction */
  defaultSortDirection?: SortDirection
  /** Make rows clickable with a link */
  rowHref?: string | ((item: T) => string)
}

/**
 * DataTable - A reusable data table component
 *
 * @example
 * <DataTable
 *   data={users}
 *   keyField="id"
 *   columns={[
 *     { key: "name", header: "Name" },
 *     { key: "email", header: "Email" },
 *     {
 *       key: "status",
 *       header: "Status",
 *       render: (user) => <Badge>{user.status}</Badge>
 *     },
 *   ]}
 *   actions={[
 *     { label: "View", icon: <Eye />, href: (user) => `/users/${user.id}` },
 *     { label: "Edit", icon: <Pencil />, href: (user) => `/users/${user.id}/edit` },
 *     { label: "Delete", icon: <Trash2 />, onClick: handleDelete, variant: "destructive" },
 *   ]}
 * />
 */
export function DataTable<T extends object>({
  data,
  columns,
  keyField,
  actions = [],
  emptyState = {
    icon: "📭",
    title: "No data found",
    description: "There's nothing to display yet.",
  },
  isLoading = false,
  className,
  actionsPosition = "inline",
  searchable = false,
  searchPlaceholder = "Search...",
  defaultSortKey,
  defaultSortDirection = "asc",
  rowHref,
}: DataTableProps<T>) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortKey ? defaultSortDirection : null)

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => {
        return columns.some((col) => {
          if (!col.searchable) return false

          let searchText: string
          if (typeof col.searchable === "function") {
            searchText = col.searchable(item)
          } else {
            // Default: convert field value to string
            const value = (item as Record<string, unknown>)[col.key]
            searchText = value != null ? String(value) : ""
          }
          return searchText.toLowerCase().includes(query)
        })
      })
    }

    // Apply sorting
    if (sortKey && sortDirection) {
      const column = columns.find((col) => col.key === sortKey)
      if (column?.sortable) {
        result.sort((a, b) => {
          let aVal: string | number | Date | null | undefined
          let bVal: string | number | Date | null | undefined

          if (typeof column.sortable === "function") {
            aVal = column.sortable(a)
            bVal = column.sortable(b)
          } else {
            aVal = (a as Record<string, unknown>)[sortKey] as string | number | Date | null | undefined
            bVal = (b as Record<string, unknown>)[sortKey] as string | number | Date | null | undefined
          }

          // Handle null/undefined values
          if (aVal == null && bVal == null) return 0
          if (aVal == null) return sortDirection === "asc" ? 1 : -1
          if (bVal == null) return sortDirection === "asc" ? -1 : 1

          // Compare values
          if (aVal instanceof Date && bVal instanceof Date) {
            return sortDirection === "asc"
              ? aVal.getTime() - bVal.getTime()
              : bVal.getTime() - aVal.getTime()
          }

          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal
          }

          // String comparison
          const aStr = String(aVal).toLowerCase()
          const bStr = String(bVal).toLowerCase()
          return sortDirection === "asc"
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr)
        })
      }
    }

    return result
  }, [data, columns, searchQuery, sortKey, sortDirection])

  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      // Cycle: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(columnKey)
      setSortDirection("asc")
    }
  }

  const visibleActions = (item: T) =>
    actions.filter((action) => !action.show || action.show(item))

  const renderActionButton = (action: RowAction<T>, item: T, index: number) => {
    const href = typeof action.href === "function" ? action.href(item) : action.href

    if (href) {
      return (
        <Button key={index} variant="ghost" size="sm" asChild>
          <Link href={href}>
            {action.icon}
            <span className="sr-only">{action.label}</span>
          </Link>
        </Button>
      )
    }

    return (
      <Button
        key={index}
        variant="ghost"
        size="sm"
        onClick={() => action.onClick?.(item)}
        className={action.variant === "destructive" ? "text-destructive" : ""}
      >
        {action.icon}
        <span className="sr-only">{action.label}</span>
      </Button>
    )
  }

  const renderDropdownActions = (item: T) => {
    const itemActions = visibleActions(item)
    if (itemActions.length === 0) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {itemActions.map((action, index) => {
            const href =
              typeof action.href === "function" ? action.href(item) : action.href

            if (href) {
              return (
                <DropdownMenuItem key={index} asChild>
                  <Link href={href} className="flex items-center gap-2">
                    {action.icon}
                    {action.label}
                  </Link>
                </DropdownMenuItem>
              )
            }

            return (
              <DropdownMenuItem
                key={index}
                onClick={() => action.onClick?.(item)}
                className={cn(
                  "flex items-center gap-2",
                  action.variant === "destructive" && "text-destructive"
                )}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-10 bg-muted rounded mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded mb-2" />
        ))}
      </div>
    )
  }

  // Check if any column has search enabled
  const hasSearchableColumns = columns.some((col) => col.searchable)

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
        variant="card"
        className={className}
      />
    )
  }

  const renderSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  return (
    <div className={cn("space-y-bc-4", className)}>
      {/* Search input */}
      {searchable && hasSearchableColumns && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Results count when filtering */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Showing {processedData.length} of {data.length} results
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort(column.key)}
                  >
                    {column.header}
                    {renderSortIcon(column.key)}
                  </Button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
            {actions.length > 0 && (
              <TableHead className="text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="h-24 text-center">
                <p className="text-muted-foreground">No results found for &quot;{searchQuery}&quot;</p>
              </TableCell>
            </TableRow>
          ) : (
          processedData.map((item) => (
          <TableRow
            key={String((item as Record<string, unknown>)[keyField as string])}
            className={cn(rowHref && "cursor-pointer hover:bg-muted/50")}
            onClick={() => {
              if (rowHref) {
                const href = typeof rowHref === "function" ? rowHref(item) : rowHref
                router.push(href)
              }
            }}
          >
            {columns.map((column) => (
              <TableCell key={column.key} className={column.className}>
                {column.render
                  ? column.render(item)
                  : String((item as Record<string, unknown>)[column.key] ?? "")}
              </TableCell>
            ))}
            {actions.length > 0 && (
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                {actionsPosition === "dropdown" ? (
                  renderDropdownActions(item)
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    {visibleActions(item).map((action, index) =>
                      renderActionButton(action, item, index)
                    )}
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Pre-configured action icons
 */
export const TableActions = {
  view: (href: string | ((item: unknown) => string)) => ({
    label: "View",
    icon: <Eye className="h-4 w-4" />,
    href,
  }),
  edit: (href: string | ((item: unknown) => string)) => ({
    label: "Edit",
    icon: <Pencil className="h-4 w-4" />,
    href,
  }),
  delete: (onClick: (item: unknown) => void) => ({
    label: "Delete",
    icon: <Trash2 className="h-4 w-4" />,
    onClick,
    variant: "destructive" as const,
  }),
}
