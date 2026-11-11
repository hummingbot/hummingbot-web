import { presets } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  /** Small mono uppercase kicker rendered above the title. */
  eyebrow?: string
  actions?: React.ReactNode
  variant?: "default" | "admin" | "centered"
  className?: string
}

/**
 * PageHeader - Standardized page header component
 *
 * @example
 * // Default (left-aligned)
 * <PageHeader title="Members" description="Browse our community members" />
 *
 * // Admin style (with actions)
 * <PageHeader
 *   title="Users"
 *   description="Manage platform users"
 *   actions={<Button>Add User</Button>}
 *   variant="admin"
 * />
 *
 * // Centered (for landing pages)
 * <PageHeader
 *   title="Our Courses"
 *   description="Learn algorithmic trading from the experts"
 *   variant="centered"
 * />
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  variant = "default",
  className,
}: PageHeaderProps) {
  if (variant === "admin") {
    return (
      <div className={cn(presets.adminPageHeader.wrapper, className)}>
        <div>
          {eyebrow && <p className={presets.adminPageHeader.eyebrow}>{eyebrow}</p>}
          <h1 className={presets.adminPageHeader.title}>{title}</h1>
          {description && (
            <p className={presets.adminPageHeader.description}>{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )
  }

  if (variant === "centered") {
    return (
      <div className={cn(presets.pageHeaderCentered.wrapper, className)}>
        {eyebrow && <p className={presets.pageHeaderCentered.eyebrow}>{eyebrow}</p>}
        <h1 className={presets.pageHeaderCentered.title}>{title}</h1>
        {description && (
          <p className={presets.pageHeaderCentered.description}>{description}</p>
        )}
        {actions && (
          <div className="flex items-center justify-center gap-4 mt-6">
            {actions}
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn(presets.pageHeader.wrapper, className)}>
      <div className="flex items-start justify-between">
        <div>
          {eyebrow && <p className={presets.pageHeader.eyebrow}>{eyebrow}</p>}
          <h1 className={presets.pageHeader.title}>{title}</h1>
          {description && (
            <p className={presets.pageHeader.description}>{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
