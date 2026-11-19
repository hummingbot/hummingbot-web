"use client"

import { useState } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { Plus } from "lucide-react"
import { LessonEditorModal, LessonFormData } from "@/botcamp/components/admin/LessonEditorModal"
import { LessonItemRow } from "@/botcamp/components/admin/LessonItemRow"

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
  slidesURL: string | null
  quizData: unknown
}

interface LessonListManagerProps {
  lessons: Lesson[]
  onLessonsChange: (lessons: Lesson[]) => void
  onError: (error: string) => void
  generateSlug: () => string
  // For cohort weeks
  cohortWeekId?: string
  // For course sections
  sectionId?: string
}

export function LessonListManager({
  lessons,
  onLessonsChange,
  onError,
  generateSlug,
  cohortWeekId,
  sectionId,
}: LessonListManagerProps) {
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [lessonForm, setLessonForm] = useState<LessonFormData>({})

  const handleAddLesson = async () => {
    const defaultSlug = generateSlug()

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
      setEditingLesson(data.id)
      setLessonForm(data)
    } catch (err) {
      onError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleSaveLesson = async () => {
    if (!editingLesson) return

    try {
      const response = await fetch(`/api/admin/lessons/${editingLesson}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save lesson")
      }

      const { data } = await response.json()
      onLessonsChange(lessons.map((l) => (l.id === editingLesson ? data : l)))
      setEditingLesson(null)
      setLessonForm({})
    } catch (err) {
      onError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Delete this lesson?")) return

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete lesson")
      }

      onLessonsChange(lessons.filter((l) => l.id !== lessonId))
    } catch (err) {
      onError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <div className="p-3 space-y-bc-2">
      {lessons.map((lesson) => (
        <LessonItemRow
          key={lesson.id}
          lesson={lesson}
          onEdit={() => {
            setEditingLesson(lesson.id)
            setLessonForm(lesson)
          }}
          onDelete={() => handleDeleteLesson(lesson.id)}
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAddLesson}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Lesson
      </Button>

      {editingLesson && (
        <LessonEditorModal
          lessonForm={lessonForm}
          onFormChange={(updates) => setLessonForm((prev) => ({ ...prev, ...updates }))}
          onSave={handleSaveLesson}
          onCancel={() => {
            setEditingLesson(null)
            setLessonForm({})
          }}
          isCohortLesson={!!cohortWeekId}
        />
      )}
    </div>
  )
}
