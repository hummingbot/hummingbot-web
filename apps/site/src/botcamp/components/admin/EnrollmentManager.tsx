"use client"

import { useState, useEffect } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { Label } from "@/botcamp/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
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
import { Loader2, Trash2, Plus, BookOpen, GraduationCap } from "lucide-react"
import type {
  Enrollment,
  CourseOption,
  CohortOption,
} from "@/botcamp/types/enrollments"

// Re-export for consumers
export type { Enrollment }

interface EnrollmentManagerProps {
  userId: string
  initialEnrollments: Enrollment[]
  onEnrollmentsChange?: (enrollments: Enrollment[]) => void
  onError?: (error: string) => void
}

export function EnrollmentManager({
  userId,
  initialEnrollments,
  onEnrollmentsChange,
  onError,
}: EnrollmentManagerProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments)
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [cohorts, setCohorts] = useState<CohortOption[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [selectedCohort, setSelectedCohort] = useState("")
  const [addingEnrollment, setAddingEnrollment] = useState(false)

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingEnrollmentId, setDeletingEnrollmentId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- as in Botcamp (its ESLint predates this rule)
    fetchCoursesAndCohorts()
  }, [])

  useEffect(() => {
    onEnrollmentsChange?.(enrollments)
  }, [enrollments, onEnrollmentsChange])

  const fetchCoursesAndCohorts = async () => {
    try {
      const [coursesRes, cohortsRes] = await Promise.all([
        fetch("/api/admin/courses"),
        fetch("/api/admin/cohorts"),
      ])

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json()
        setCourses(coursesData.data || [])
      }

      if (cohortsRes.ok) {
        const cohortsData = await cohortsRes.json()
        setCohorts(cohortsData.data || [])
      }
    } catch (err) {
      console.error("Failed to fetch courses/cohorts:", err)
    }
  }

  const handleAddCourseEnrollment = async () => {
    if (!selectedCourse) return

    setAddingEnrollment(true)

    try {
      const response = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          courseId: selectedCourse,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add enrollment")
      }

      const { data } = await response.json()
      setEnrollments((prev) => [...prev, data])
      setSelectedCourse("")
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to add enrollment")
    } finally {
      setAddingEnrollment(false)
    }
  }

  const handleAddCohortEnrollment = async () => {
    if (!selectedCohort) return

    setAddingEnrollment(true)

    try {
      const response = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          cohortId: selectedCohort,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add enrollment")
      }

      const { data } = await response.json()
      setEnrollments((prev) => [...prev, data])
      setSelectedCohort("")
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to add enrollment")
    } finally {
      setAddingEnrollment(false)
    }
  }

  const openDeleteDialog = (id: string) => {
    setDeletingEnrollmentId(id)
    setShowDeleteDialog(true)
  }

  const handleDeleteEnrollment = async () => {
    if (!deletingEnrollmentId) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/enrollments/${deletingEnrollmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to remove enrollment")
      }

      setEnrollments((prev) => prev.filter((e) => e.id !== deletingEnrollmentId))
      setShowDeleteDialog(false)
      setDeletingEnrollmentId(null)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to remove enrollment")
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter out already enrolled courses/cohorts
  const availableCourses = courses.filter(
    (course) => !enrollments.some((e) => e.course?.id === course.id)
  )
  const availableCohorts = cohorts.filter(
    (cohort) => !enrollments.some((e) => e.cohort?.id === cohort.id)
  )

  // Get the enrollment being deleted for the dialog message
  const enrollmentToDelete = enrollments.find((e) => e.id === deletingEnrollmentId)
  const deleteMessage = enrollmentToDelete?.course
    ? `course "${enrollmentToDelete.course.title}"`
    : enrollmentToDelete?.cohort
      ? `Cohort ${enrollmentToDelete.cohort.number}${enrollmentToDelete.cohort.title ? `: ${enrollmentToDelete.cohort.title}` : ""}`
      : "this enrollment"

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Enrollments
          </CardTitle>
          <CardDescription>
            Manage course and cohort enrollments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-bc-6">
          {/* Current Enrollments */}
          {enrollments.length > 0 ? (
            <div className="space-y-bc-2">
              <Label className="text-sm font-medium">
                Current Enrollments ({enrollments.length})
              </Label>
              <div className="space-y-bc-2">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-3 rounded-bc-lg border bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {enrollment.course ? (
                        <>
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{enrollment.course.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">Course</span>
                          </div>
                        </>
                      ) : enrollment.cohort ? (
                        <>
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">
                              Cohort {enrollment.cohort.number}
                              {enrollment.cohort.title && `: ${enrollment.cohort.title}`}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">Cohort</span>
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(enrollment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No enrollments yet</p>
          )}

          {/* Add Course Enrollment */}
          {availableCourses.length > 0 && (
            <div className="space-y-bc-2">
              <Label className="text-sm font-medium">Add Course Enrollment</Label>
              <div className="flex gap-2">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddCourseEnrollment}
                  disabled={!selectedCourse || addingEnrollment}
                >
                  {addingEnrollment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Add Cohort Enrollment */}
          {availableCohorts.length > 0 && (
            <div className="space-y-bc-2">
              <Label className="text-sm font-medium">Add Cohort Enrollment</Label>
              <div className="flex gap-2">
                <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a cohort..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        Cohort {cohort.number}{cohort.title && `: ${cohort.title}`} ({cohort.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddCohortEnrollment}
                  disabled={!selectedCohort || addingEnrollment}
                >
                  {addingEnrollment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {availableCourses.length === 0 && availableCohorts.length === 0 && enrollments.length > 0 && (
            <p className="text-sm text-muted-foreground">
              User is enrolled in all available courses and cohorts
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete Enrollment Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) setDeletingEnrollmentId(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Enrollment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the enrollment for {deleteMessage}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEnrollment}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
