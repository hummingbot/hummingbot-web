"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"

interface SortableSectionProps {
  id: string
  title: string
  lessonCount: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function SortableSection({
  id,
  title,
  lessonCount,
  isExpanded,
  onToggle,
  children,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Show drop indicator line when another item is being dragged over this one
  const showDropIndicator = isOver && !isDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border border-border rounded-bc-lg overflow-hidden bg-card transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        showDropIndicator && "ring-2 ring-primary/50 ring-offset-2"
      )}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-2 p-3 bg-muted/50 transition-colors cursor-pointer hover:bg-muted"
        onClick={onToggle}
      >
        <button
          className="touch-none cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="flex-1 font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
        </span>
      </div>

      {/* Section content */}
      {isExpanded && children}
    </div>
  )
}
