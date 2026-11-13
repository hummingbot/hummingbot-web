// Shared types for the learn surface (course + cohort overviews and lesson
// pages). Lesson type and group structure intentionally match the existing
// Prisma shapes so callers can pass DB rows with minimal mapping.

export type LessonType = "VIDEO" | "ARTICLE" | "QUIZ" | "CHALLENGE"

export interface LearnLesson {
  id: string
  slug: string
  title: string
  type: LessonType | string
  duration?: number | null
  isFree?: boolean
  /** The signed-in viewer's progress on this lesson — absent means not
   *  started. "in-progress" once playback has started; "completed" once
   *  it crosses the watch threshold (or, for non-video lessons, once
   *  opened). */
  progressStatus?: "in-progress" | "completed"
}

export interface LearnGroup {
  id: string
  title: string
  description?: string | null
  /** Cohort week number; falls back to grid position when null. */
  number?: number
  lessons: LearnLesson[]
}

export type ResourceKind = "course" | "cohort"

export interface LearnResource {
  kind: ResourceKind
  /** Slug (course) or stringified cohort number ("13"). */
  slug: string
  title: string
  description?: string | null
  /** Cover image. Falls back to a placeholder gradient if absent. */
  thumbnail?: string | null
}

export interface BreadcrumbCrumb {
  label: string
  href?: string
}
