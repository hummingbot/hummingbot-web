import { Badge } from "@/botcamp/components/ui/badge"
import { getBadgeClasses } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"

interface StatusBadgeProps {
  value: string
  type: "status" | "role" | "level" | "lessonType" | "notification"
  className?: string
}

/**
 * StatusBadge - Centralized badge component for consistent status/type display
 *
 * @example
 * <StatusBadge value="ACTIVE" type="status" />
 * <StatusBadge value="ADMIN" type="role" />
 * <StatusBadge value="VIDEO" type="lessonType" />
 */
export function StatusBadge({ value, type, className }: StatusBadgeProps) {
  const badgeClasses = getBadgeClasses(value, type)

  // Format the display value (capitalize first letter, replace underscores)
  const displayValue = value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <Badge variant="outline" className={cn(badgeClasses, className)}>
      {displayValue}
    </Badge>
  )
}
