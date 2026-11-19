import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  variant?: "default" | "primary" | "success" | "warning" | "danger"
}

const variantStyles = {
  default: "",
  primary: "border-primary/50 bg-primary/5",
  success: "border-green-500/50 bg-green-500/5",
  warning: "border-yellow-500/50 bg-yellow-500/5",
  danger: "border-red-500/50 bg-red-500/5",
}

const iconVariantStyles = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
}

/**
 * StatCard - A card component for displaying statistics and metrics
 *
 * @example
 * <StatCard
 *   title="Total Users"
 *   value={1234}
 *   description="Active members"
 *   icon={Users}
 *   variant="primary"
 * />
 */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  variant = "default",
}: StatCardProps) {
  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-bc-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", iconVariantStyles[variant])} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-green-500" : "text-red-500"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * StatCardGrid - A responsive grid container for StatCards
 */
export function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode
  columns?: 2 | 3 | 4
  className?: string
}) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  )
}
