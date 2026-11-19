"use client"

import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/botcamp/lib/utils"
import { useApplicationsFilter, type ApplicationsFilterValue } from "./ApplicationsFilterContext"

interface HackathonStatCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  value: string
  /** When set, clicking the card filters AdminApplicationsTable to this value. */
  filterValue?: ApplicationsFilterValue
  /** Render as a plain button (no filter wiring) for a wrapping trigger — e.g. DialogTrigger asChild — to control. */
  interactive?: boolean
}

// forwardRef + prop-spreading matter here: DialogTrigger's `asChild` clones
// this element via Radix Slot, which injects onClick/ref/aria-* props onto
// it directly — a component that doesn't accept and forward them would
// silently drop the click handler, so the trigger would render but do nothing.
export const HackathonStatCard = forwardRef<HTMLButtonElement, HackathonStatCardProps>(
  ({ label, value, filterValue, interactive, className: extraClassName, onClick, ...rest }, ref) => {
    const filterCtx = useApplicationsFilter()
    const isFilterActive = !!filterValue && filterCtx?.filter === filterValue
    const isFilterClickable = !!filterValue && !!filterCtx
    const isClickable = isFilterClickable || interactive

    const content = (
      <>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
      </>
    )

    const className = cn(
      "flex-1 rounded-bc-lg border border-border bg-card px-4 py-3 text-left",
      isClickable && "transition-colors hover:border-primary/40",
      isFilterActive && "border-primary bg-primary/5",
      extraClassName
    )

    if (!isClickable) {
      return <div className={className}>{content}</div>
    }

    return (
      <button
        ref={ref}
        type="button"
        className={className}
        onClick={isFilterClickable ? () => filterCtx.setFilter(filterValue) : onClick}
        {...rest}
      >
        {content}
      </button>
    )
  }
)
HackathonStatCard.displayName = "HackathonStatCard"
