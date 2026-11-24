"use client"

import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { LessonTypeBadge } from "@/botcamp/components/ui/lesson-type-badge"
import { GripVertical, Pencil, Trash2 } from "lucide-react"

interface Lesson {
  id: string
  title: string
  type: string
  duration: number | null
  isFree: boolean
}

interface LessonItemRowProps {
  lesson: Lesson
  onEdit: () => void
  onDelete: () => void
}

export function LessonItemRow({ lesson, onEdit, onDelete }: LessonItemRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded border border-border bg-background">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      <LessonTypeBadge type={lesson.type} />
      <span className="flex-1">{lesson.title}</span>
      {lesson.duration && (
        <span className="text-sm text-muted-foreground">
          {lesson.duration} min
        </span>
      )}
      {lesson.isFree && <Badge variant="outline">Free</Badge>}
      <Button size="sm" variant="ghost" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  )
}
