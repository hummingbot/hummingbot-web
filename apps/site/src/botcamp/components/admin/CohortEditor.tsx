"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Plus, Trash2, Loader2 } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/botcamp/components/ui/dialog"
import { EditorHeader } from "@/botcamp/components/admin/EditorHeader"
import { LessonListManager, ExpandableContainer, Lesson } from "@/botcamp/components/admin/editor-shared"

interface Week {
  id: string
  weekNumber: number
  title: string
  description: string | null
  date: string | null
  lessons: Lesson[]
}

interface Cohort {
  id: string
  number: number
  slug: string
  title: string | null
  description: string | null
  status: string
  startDate: string
  endDate: string
  price: number | null
  maxStudents: number | null
  retainedSeats: number
  registrationUrl: string | null
  demoDayUrl: string | null
  weeks: Week[]
  enrollmentCount: number
}

interface CohortEditorProps {
  cohort: Cohort | null
}

export function CohortEditor({ cohort }: CohortEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cohort form state
  const [formData, setFormData] = useState({
    number: cohort?.number || 1,
    title: cohort?.title || "",
    description: cohort?.description || "",
    status: cohort?.status || "UPCOMING",
    startDate: cohort?.startDate
      ? new Date(cohort.startDate).toISOString().split("T")[0]
      : "",
    endDate: cohort?.endDate
      ? new Date(cohort.endDate).toISOString().split("T")[0]
      : "",
    price: cohort?.price || 0,
    maxStudents: cohort?.maxStudents || null,
    retainedSeats: cohort?.retainedSeats || 0,
    registrationUrl: cohort?.registrationUrl || "",
    demoDayUrl: cohort?.demoDayUrl || "",
  })

  // Calculate spots remaining dynamically
  const enrollmentCount = cohort?.enrollmentCount || 0
  const spotsRemaining = formData.maxStudents
    ? Math.max(0, formData.maxStudents - formData.retainedSeats - enrollmentCount)
    : null

  // Weeks state
  const [weeks, setWeeks] = useState<Week[]>(cohort?.weeks || [])
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())

  // Week editing
  const [editingWeek, setEditingWeek] = useState<string | null>(null)
  const [weekForm, setWeekForm] = useState<Partial<Week>>({})

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Week delete state
  const [showDeleteWeekDialog, setShowDeleteWeekDialog] = useState(false)
  const [deletingWeekId, setDeletingWeekId] = useState<string | null>(null)
  const [isDeletingWeek, setIsDeletingWeek] = useState(false)

  const isNew = !cohort

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const handleSaveCohort = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        number: formData.number,
        title: formData.title || null,
        description: formData.description || null,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        price: formData.price || null,
        maxStudents: formData.maxStudents,
        retainedSeats: formData.retainedSeats,
        registrationUrl: formData.registrationUrl || null,
        demoDayUrl: formData.demoDayUrl || null,
      }

      const url = isNew ? "/api/admin/cohorts" : `/api/admin/cohorts/${cohort.id}`
      const method = isNew ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save cohort")
      }

      const { data } = await response.json()

      if (isNew) {
        router.push(`/admin/cohorts/${data.id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddWeek = async () => {
    if (!cohort) return

    const nextWeekNumber = weeks.length > 0
      ? Math.max(...weeks.map((w) => w.weekNumber)) + 1
      : 1

    try {
      const response = await fetch("/api/admin/weeks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId: cohort.id,
          weekNumber: nextWeekNumber,
          title: `Week ${nextWeekNumber}`,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add week")
      }

      const { data } = await response.json()
      setWeeks((prev) => [...prev, { ...data, lessons: [] }])
      setExpandedWeeks((prev) => new Set([...prev, data.id]))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleSaveWeek = async () => {
    if (!editingWeek) return

    // Validate week number is not duplicate
    const duplicateWeek = weeks.find(
      (w) => w.id !== editingWeek && w.weekNumber === weekForm.weekNumber
    )
    if (duplicateWeek) {
      setError(
        `Week ${weekForm.weekNumber} already exists ("${duplicateWeek.title}"). Please use a different week number.`
      )
      return
    }

    try {
      const response = await fetch(`/api/admin/weeks/${editingWeek}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weekForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save week")
      }

      const { data } = await response.json()
      setWeeks((prev) =>
        prev.map((w) => (w.id === editingWeek ? { ...w, ...data } : w))
      )
      setEditingWeek(null)
      setWeekForm({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeleteWeek = async () => {
    if (!deletingWeekId) return

    setIsDeletingWeek(true)
    try {
      const response = await fetch(`/api/admin/weeks/${deletingWeekId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete week")
      }

      setWeeks((prev) => prev.filter((w) => w.id !== deletingWeekId))
      setShowDeleteWeekDialog(false)
      setDeletingWeekId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsDeletingWeek(false)
    }
  }

  const openDeleteWeekDialog = (weekId: string) => {
    setDeletingWeekId(weekId)
    setShowDeleteWeekDialog(true)
  }

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekId)) {
        next.delete(weekId)
      } else {
        next.add(weekId)
      }
      return next
    })
  }

  const updateWeekLessons = (weekId: string, lessons: Lesson[]) => {
    setWeeks((prev) =>
      prev.map((w) => (w.id === weekId ? { ...w, lessons } : w))
    )
  }

  const handleDeleteCohort = async () => {
    if (!cohort) return

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/cohorts/${cohort.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete cohort")
      }

      router.push("/admin/cohorts")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete cohort")
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-bc-6">
      <EditorHeader
        breadcrumb={[
          { label: "Cohorts", href: "/admin/cohorts" },
          { label: isNew ? "New Cohort" : `Cohort ${cohort.number}` },
        ]}
        title={isNew ? "Create Cohort" : `Edit: Cohort ${cohort.number}`}
        subtitle={!isNew && cohort.title ? cohort.title : undefined}
        isNew={isNew}
        isLoading={isLoading}
        onSave={handleSaveCohort}
        createLabel="Create Cohort"
        error={error}
      />

      {/* Cohort Details */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="number">Cohort Number</Label>
              <Input
                id="number"
                name="number"
                type="number"
                value={formData.number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    number: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Advanced Market Making"
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPCOMING">Upcoming</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Cohort description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="price">Price (cents)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          {/* Enrollment Capacity */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="maxStudents">Max Students</Label>
              <Input
                id="maxStudents"
                name="maxStudents"
                type="number"
                value={formData.maxStudents || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxStudents: parseInt(e.target.value) || null,
                  }))
                }
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="retainedSeats">Retained Seats</Label>
              <Input
                id="retainedSeats"
                name="retainedSeats"
                type="number"
                value={formData.retainedSeats}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    retainedSeats: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">Reserved seats not available for signup</p>
            </div>
            <div className="space-y-bc-2">
              <Label>Enrolled</Label>
              <div className="h-10 flex items-center px-3 border rounded-bc-md bg-muted text-muted-foreground">
                {enrollmentCount}
              </div>
            </div>
            <div className="space-y-bc-2">
              <Label>Spots Remaining</Label>
              <div className="h-10 flex items-center px-3 border rounded-bc-md bg-muted text-muted-foreground">
                {spotsRemaining !== null ? spotsRemaining : "Unlimited"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="registrationUrl">Registration URL</Label>
              <Input
                id="registrationUrl"
                name="registrationUrl"
                value={formData.registrationUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="demoDayUrl">Demo Day URL</Label>
              <Input
                id="demoDayUrl"
                name="demoDayUrl"
                value={formData.demoDayUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weeks & Lessons */}
      {!isNew && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weeks & Lessons</CardTitle>
            <Button onClick={handleAddWeek} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Week
            </Button>
          </CardHeader>
          <CardContent className="space-y-bc-4">
            {weeks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No weeks yet. Add a week to get started.
              </p>
            ) : (
              weeks.map((week) => (
                <ExpandableContainer
                  key={week.id}
                  id={week.id}
                  title={week.title}
                  subtitle={`Week ${week.weekNumber}`}
                  itemCount={week.lessons.length}
                  itemLabel="lesson"
                  isExpanded={expandedWeeks.has(week.id)}
                  onToggle={() => toggleWeek(week.id)}
                  onEdit={() => {
                    setEditingWeek(week.id)
                    setWeekForm(week)
                  }}
                  onDelete={() => openDeleteWeekDialog(week.id)}
                >
                  <LessonListManager
                    lessons={week.lessons}
                    onLessonsChange={(lessons) => updateWeekLessons(week.id, lessons)}
                    onError={setError}
                    cohortWeekId={week.id}
                    generateSlug={() =>
                      `cohort-${formData.number}-week-${week.weekNumber}-lesson-${week.lessons.length + 1}`
                    }
                  />
                </ExpandableContainer>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Cohort */}
      {!isNew && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete this cohort</p>
                <p className="text-sm text-muted-foreground">
                  Once deleted, this cohort and all its weeks, lessons, and enrollments will be permanently removed.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Cohort
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week Editor Dialog */}
      <Dialog open={!!editingWeek} onOpenChange={(open) => {
        if (!open) {
          setEditingWeek(null)
          setWeekForm({})
          setError(null)
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Week</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-bc-md text-sm">
              {error}
            </div>
          )}
          <div className="space-y-bc-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-bc-2">
                <Label>Week Number</Label>
                <Input
                  type="number"
                  min={0}
                  value={weekForm.weekNumber ?? 0}
                  onChange={(e) => {
                    setError(null)
                    setWeekForm((prev) => ({
                      ...prev,
                      weekNumber: parseInt(e.target.value) || 0,
                    }))
                  }}
                />
              </div>
              <div className="space-y-bc-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={
                    weekForm.date
                      ? new Date(weekForm.date).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    setWeekForm((prev) => ({
                      ...prev,
                      date: e.target.value || null,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-bc-2">
              <Label>Title</Label>
              <Input
                value={weekForm.title || ""}
                onChange={(e) =>
                  setWeekForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-bc-2">
              <Label>Description</Label>
              <Textarea
                value={weekForm.description || ""}
                onChange={(e) =>
                  setWeekForm((prev) => ({
                    ...prev,
                    description: e.target.value || null,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingWeek(null)
                setWeekForm({})
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveWeek}>Save Week</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Cohort Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cohort</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Cohort {formData.number}
              {formData.title ? ` (${formData.title})` : ""}? This action cannot be undone.
              All weeks, lessons, enrollments, and strategies associated with this cohort will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCohort}
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

      {/* Delete Week Confirmation Dialog */}
      <AlertDialog open={showDeleteWeekDialog} onOpenChange={(open) => {
        setShowDeleteWeekDialog(open)
        if (!open) setDeletingWeekId(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Week</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this week? This action cannot be undone.
              All lessons in this week will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingWeek}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWeek}
              disabled={isDeletingWeek}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingWeek ? (
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
