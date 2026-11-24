"use client"

import { ReactNode } from "react"
import { Button } from "@/botcamp/components/ui/button"
import {
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

interface ExpandableContainerProps {
  id: string
  title: string
  subtitle?: string
  itemCount: number
  itemLabel: string
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  children: ReactNode
}

export function ExpandableContainer({
  title,
  subtitle,
  itemCount,
  itemLabel,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  children,
}: ExpandableContainerProps) {
  return (
    <div className="border border-border rounded-bc-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-muted/50">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <button onClick={onToggle} className="p-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <span className="flex-1 font-medium">
          {subtitle ? `${subtitle}: ` : ""}{title}
        </span>
        <span className="text-sm text-muted-foreground">
          {itemCount} {itemLabel}{itemCount !== 1 ? "s" : ""}
        </span>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Content */}
      {isExpanded && children}
    </div>
  )
}
