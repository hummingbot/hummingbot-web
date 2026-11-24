// Enrollment types - shared across components and API routes

// Base entity references used in enrollments
export interface CourseRef {
  id: string
  title: string
  slug?: string
}

export interface CohortRef {
  id: string
  number: number
  title: string | null
  status?: string
}

export interface HackathonRef {
  id: string
  slug: string
  title: string
  status?: string
}

// Enrollment records
export interface Enrollment {
  id: string
  course: CourseRef | null
  cohort: CohortRef | null
  enrolledAt: string
  status?: string
  pricePaid?: number
}

// API input types
export interface CreateEnrollmentInput {
  userId: string
  courseId?: string
  cohortId?: string
}

// Selection types for dropdowns
export interface CourseOption {
  id: string
  title: string
  slug: string
}

export interface CohortOption {
  id: string
  number: number
  title: string | null
  status: string
}

export interface HackathonOption {
  id: string
  slug: string
  title: string
  status: string
}

// Enrollment status types (from Prisma)
export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED"
