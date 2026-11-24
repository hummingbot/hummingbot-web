"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Link from "next/link"
import { GripVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { LessonTypeBadge } from "@/botcamp/components/ui/lesson-type-badge"
import { cn } from "@/botcamp/lib/utils"

interface Lesson {
  id: string
  title: string
  type: string
  duration: number | null
  isFree: boolean
}

interface SortableLessonProps {
  lesson: Lesson
  courseId: string
  onDelete: () => void
}

export function SortableLesson({ lesson, courseId, onDelete }: SortableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const showDropIndicator = isOver && !isDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded border border-border bg-background transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        showDropIndicator && "ring-2 ring-primary/50 ring-offset-1"
      )}
    >
      <button
        className="touch-none cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <LessonTypeBadge type={lesson.type} />
      <span className="flex-1">{lesson.title}</span>
      {lesson.duration && (
        <span className="text-sm text-muted-foreground">
          {lesson.duration} min
        </span>
      )}
      {lesson.isFree && <Badge variant="outline">Free</Badge>}
      <Button size="sm" variant="ghost" asChild>
        <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  )
}
