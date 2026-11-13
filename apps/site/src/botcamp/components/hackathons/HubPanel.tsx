import type { LucideIcon } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"

/**
 * A single gauge in the racing-hub instrument panel: understated dark
 * card with a mono uppercase label (like a labeled instrument) and an
 * optional right-aligned action.
 */
export function HubPanel({
  label,
  icon: Icon,
  action,
  className,
  bodyClassName,
  children,
}: {
  label: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-bc-xl border border-border bg-gradient-to-br from-muted/30 via-card to-background p-5 md:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </p>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
