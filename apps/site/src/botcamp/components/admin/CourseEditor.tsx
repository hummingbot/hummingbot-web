"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
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
import { Plus, Trash2, Loader2 } from "lucide-react"
import { EditorHeader } from "@/botcamp/components/admin/EditorHeader"
import { SortableSection } from "@/botcamp/components/admin/SortableSection"
import { SortableLessonList, Lesson } from "@/botcamp/components/admin/SortableLessonList"

interface Section {
  id: string
  title: string
  sortOrder: number
  lessons: Lesson[]
}

interface Instructor {
  id: string
  name: string | null
  email: string
}

interface Course {
  id: string
  slug: string
  title: string
  description: string | null
  level: string
  published: boolean
  price: number
  sortOrder: number
  sections: Section[]
  instructorId: string | null
  instructor: Instructor | null
}

interface CourseEditorProps {
  course: Course | null
  isAdmin?: boolean
  instructors?: Instructor[]
}

export function CourseEditor({ course, isAdmin = false, instructors = [] }: CourseEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Course form state (price stored in dollars for display, converted to cents on save)
  const [formData, setFormData] = useState({
    title: course?.title || "",
    slug: course?.slug || "",
    description: course?.description || "",
    level: course?.level || "BASIC",
    price: course?.price ? course.price / 100 : 0,
    published: course?.published || false,
    instructorId: course?.instructorId || "",
  })

  // Sections state
  const [sections, setSections] = useState<Section[]>(course?.sections || [])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)


  // Drag state
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  const isNew = !course

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData((prev) => ({
      ...prev,
      title,
      slug: isNew ? generateSlug(title) : prev.slug,
    }))
    setError(null)
  }

  const handleSaveCourse = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        level: formData.level,
        price: Math.round(formData.price * 100),
        published: formData.published,
      }

      // Only admins can set instructorId
      if (isAdmin) {
        payload.instructorId = formData.instructorId || null
      }

      const url = isNew
        ? "/api/admin/courses"
        : `/api/admin/courses/${course.id}`
      const method = isNew ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save course")
      }

      const { data } = await response.json()

      if (isNew) {
        router.push(`/admin/courses/${data.id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSection = async () => {
    if (!course) return

    try {
      const response = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          title: "New Section",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add section")
      }

      const { data } = await response.json()
      setSections((prev) => [...prev, { ...data, lessons: [] }])
      setExpandedSections((prev) => new Set([...prev, data.id]))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleSaveSection = async (sectionId: string, title: string) => {
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save section")
      }

      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, title } : s
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete section")
      }

      setSections((prev) => prev.filter((s) => s.id !== sectionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const updateSectionLessons = (sectionId: string, lessons: Lesson[]) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, lessons } : s))
    )
  }

  const handleDeleteCourse = async () => {
    if (!course) return

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete course")
      }

      router.push("/admin/courses")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete course")
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Section drag handlers
  const handleSectionDragStart = (event: DragStartEvent) => {
    setActiveSectionId(event.active.id as string)
  }

  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveSectionId(null)

    if (!over || active.id === over.id || !course) return

    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)

    const newSections = arrayMove(sections, oldIndex, newIndex)
    setSections(newSections)

    // Save to server
    try {
      const response = await fetch("/api/admin/sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          sectionIds: newSections.map((s) => s.id),
        }),
      })

      if (!response.ok) {
        // Revert on error
        setSections(sections)
        const data = await response.json()
        throw new Error(data.error || "Failed to reorder sections")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder sections")
    }
  }

  const activeSection = activeSectionId
    ? sections.find((s) => s.id === activeSectionId)
    : null

  return (
    <div className="space-y-bc-6">
      <EditorHeader
        breadcrumb={[
          { label: "Courses", href: "/admin/courses" },
          { label: isNew ? "New Course" : course.title },
        ]}
        title={isNew ? "Create Course" : `Edit: ${course.title}`}
        subtitle={!isNew ? `/${course.slug}` : undefined}
        isNew={isNew}
        isLoading={isLoading}
        onSave={handleSaveCourse}
        createLabel="Create Course"
        error={error}
      />

      {/* Course Details */}
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Course title"
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="course-slug"
              />
            </div>
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Course description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="level">Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Basic</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0"
              />
            </div>
          </div>

          {/* Instructor selector - admin only */}
          {isAdmin && (
            <div className="space-y-bc-2">
              <Label htmlFor="instructor">Instructor</Label>
              <Select
                value={formData.instructorId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, instructorId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No instructor assigned</SelectItem>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.name || instructor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="published"
              checked={formData.published}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, published: checked === true }))
              }
            />
            <Label htmlFor="published">Published</Label>
          </div>
        </CardContent>
      </Card>

      {/* Sections & Lessons */}
      {!isNew && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sections & Lessons</CardTitle>
            <Button onClick={handleAddSection} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </CardHeader>
          <CardContent className="space-y-bc-4">
            {sections.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No sections yet. Add a section to get started.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleSectionDragStart}
                onDragEnd={handleSectionDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-bc-4">
                    {sections.map((section) => (
                      <SortableSection
                        key={section.id}
                        id={section.id}
                        title={section.title}
                        lessonCount={section.lessons.length}
                        isExpanded={expandedSections.has(section.id)}
                        onToggle={() => toggleSection(section.id)}
                      >
                        <SortableLessonList
                          lessons={section.lessons}
                          sectionId={section.id}
                          courseId={course.id}
                          courseSlug={formData.slug}
                          onLessonsChange={(lessons) => updateSectionLessons(section.id, lessons)}
                          onError={setError}
                          sectionTitle={section.title}
                          onEditSection={(newTitle) => handleSaveSection(section.id, newTitle)}
                          onDeleteSection={() => handleDeleteSection(section.id)}
                        />
                      </SortableSection>
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeSection && (
                    <div className="border border-primary rounded-bc-lg bg-card p-3 shadow-lg opacity-90">
                      <span className="font-medium">{activeSection.title}</span>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Course */}
      {!isNew && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete this course</p>
                <p className="text-sm text-muted-foreground">
                  Once deleted, this course and all its sections and lessons will be permanently removed.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Course
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Course Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{formData.title}&quot;? This action cannot be undone.
              All sections, lessons, and enrollments associated with this course will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
