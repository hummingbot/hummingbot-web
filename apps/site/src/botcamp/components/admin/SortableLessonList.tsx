"use client"

import { useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/botcamp/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/botcamp/components/ui/alert-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { SortableLesson } from "@/botcamp/components/admin/SortableLesson"
import { LessonTypeBadge } from "@/botcamp/components/ui/lesson-type-badge"

export interface Lesson {
  id: string
  slug: string
  title: string
  type: string
  sortOrder: number
  isFree: boolean
  videoId: string | null
  duration: number | null
  content: string | null
  transcript: string | null
  quizData: unknown
}

interface SortableLessonListProps {
  lessons: Lesson[]
  sectionId?: string
  cohortWeekId?: string
  courseId: string
  courseSlug: string
  onLessonsChange: (lessons: Lesson[]) => void
  onError: (error: string) => void
  sectionTitle?: string
  onEditSection?: (newTitle: string) => void
  onDeleteSection?: () => void
}

export function SortableLessonList({
  lessons,
  sectionId,
  cohortWeekId,
  courseId,
  courseSlug,
  onLessonsChange,
  onError,
  sectionTitle,
  onEditSection,
  onDeleteSection,
}: SortableLessonListProps) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeleteLessonDialog, setShowDeleteLessonDialog] = useState(false)
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState(sectionTitle || "")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleAddLesson = async () => {
    const defaultSlug = `${courseSlug}-lesson-${lessons.length + 1}`

    try {
      const response = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(cohortWeekId && { cohortWeekId }),
          ...(sectionId && { sectionId }),
          slug: defaultSlug,
          title: "New Lesson",
          type: "VIDEO",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add lesson")
      }

      const { data } = await response.json()
      onLessonsChange([...lessons, data])
    } catch (err) {
      onError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeleteLessonClick = (lessonId: string) => {
    setDeletingLessonId(lessonId)
    setShowDeleteLessonDialog(true)
  }

  const handleConfirmDeleteLesson = async () => {
    if (!deletingLessonId) return

    try {
      const response = await fetch(`/api/admin/lessons/${deletingLessonId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete lesson")
      }

      onLessonsChange(lessons.filter((l) => l.id !== deletingLessonId))
    } catch (err) {
      onError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setShowDeleteLessonDialog(false)
      setDeletingLessonId(null)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLessonId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLessonId(null)

    if (!over || active.id === over.id) return

    const oldIndex = lessons.findIndex((l) => l.id === active.id)
    const newIndex = lessons.findIndex((l) => l.id === over.id)

    const newLessons = arrayMove(lessons, oldIndex, newIndex)
    onLessonsChange(newLessons)

    // Save to server
    try {
      const response = await fetch("/api/admin/lessons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          lessonIds: newLessons.map((l) => l.id),
        }),
      })

      if (!response.ok) {
        // Revert on error
        onLessonsChange(lessons)
        const data = await response.json()
        throw new Error(data.error || "Failed to reorder lessons")
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to reorder lessons")
    }
  }

  const activeLesson = activeLessonId
    ? lessons.find((l) => l.id === activeLessonId)
    : null

  return (
    <div className="p-3 space-y-bc-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {lessons.map((lesson) => (
            <SortableLesson
              key={lesson.id}
              lesson={lesson}
              courseId={courseId}
              onDelete={() => handleDeleteLessonClick(lesson.id)}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeLesson && (
            <div className="flex items-center gap-2 p-2 rounded border border-primary bg-card shadow-lg opacity-90">
              <LessonTypeBadge type={activeLesson.type} />
              <span className="flex-1">{activeLesson.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {(onEditSection || onDeleteSection) ? (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddLesson}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
          {onEditSection && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditTitle(sectionTitle || "")
                setShowEditDialog(true)
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Section
            </Button>
          )}
          {onDeleteSection && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
              Delete Section
            </Button>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddLesson}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Lesson
        </Button>
      )}

      {/* Edit Section Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>
              Update the section title.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-bc-4 py-4">
            <div className="space-y-bc-2">
              <Label htmlFor="sectionTitle">Title</Label>
              <Input
                id="sectionTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Section title"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editTitle.trim()) {
                    onEditSection?.(editTitle.trim())
                    setShowEditDialog(false)
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editTitle.trim()) {
                  onEditSection?.(editTitle.trim())
                  setShowEditDialog(false)
                }
              }}
              disabled={!editTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? This will also delete all lessons in this section. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDeleteSection?.()
                setShowDeleteDialog(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Lesson Dialog */}
      <AlertDialog open={showDeleteLessonDialog} onOpenChange={setShowDeleteLessonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingLessonId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDeleteLesson}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
