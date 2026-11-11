import { cn } from "@/botcamp/lib/utils"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon | string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  variant?: "default" | "card" | "inline"
}

/**
 * EmptyState - A reusable component for displaying empty states
 *
 * @example
 * // With emoji
 * <EmptyState
 *   icon="🔍"
 *   title="No results found"
 *   description="Try adjusting your search or filters"
 *   action={<Button onClick={clearFilters}>Clear filters</Button>}
 * />
 *
 * @example
 * // With Lucide icon
 * <EmptyState
 *   icon={Users}
 *   title="No members yet"
 *   description="Members will appear here once they join"
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) {
  const variantStyles = {
    default: "py-16 px-4",
    card: "py-12 px-6 border rounded-bc-lg bg-card",
    inline: "py-8 px-4",
  }

  const renderIcon = () => {
    if (!icon) return null

    if (typeof icon === "string") {
      // Emoji
      return <div className="text-6xl mb-6">{icon}</div>
    }

    // Lucide icon
    const Icon = icon
    return (
      <div className="mb-6 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variantStyles[variant],
        className
      )}
    >
      {renderIcon()}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  )
}

/**
 * NoResults - A specialized empty state for search/filter results
 */
export function NoResults({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string
  onClear?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={
        searchTerm
          ? `No results match "${searchTerm}". Try adjusting your search or filters.`
          : "Try adjusting your search or filters to find what you're looking for."
      }
      action={
        onClear && (
          <button
            onClick={onClear}
            className="text-primary hover:underline text-sm font-medium"
          >
            Clear all filters
          </button>
        )
      }
      className={className}
    />
  )
}

/**
 * NoData - A specialized empty state for when there's no data
 */
export function NoData({
  title,
  description,
  action,
  className,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <EmptyState
      icon="📭"
      title={title || "No data yet"}
      description={description || "Data will appear here once it's available."}
      action={action}
      className={className}
    />
  )
}
