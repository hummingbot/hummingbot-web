/**
 * Shared types and display helpers for the admin and team application review
 * screens (AdminApplicationReviewer / ApplicationReviewer).
 */

export interface ReviewApplicant {
  name: string | null
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  slug: string | null
  github: string | null
  linkedin: string | null
  email?: string
}

export type ReviewStrategyFile =
  | { id: string; filename: string; type: "LINK"; url: string | null }
  | {
      id: string
      filename: string
      type: "FILE"
      mimeType: string | null
      size: number | null
      content: string | null
    }

export interface ReviewStrategyImage {
  id: string
  filename: string
}

export interface ReviewStrategy {
  id: number
  title: string
  slug: string
  summary: string | null
  details: string | null
  tags: string[]
  strategyType: string
  exchanges: string[]
  videoURL: string | null
  updatedAt: string
  files: ReviewStrategyFile[]
  /** Uploaded resource images, streamed from /api/strategies/[slug]/images/[id]. */
  images: ReviewStrategyImage[]
}

export function getDisplayName(user: ReviewApplicant): string {
  if (user.name) return user.name
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return "Unknown"
}

export function getInitials(user: ReviewApplicant): string {
  return getDisplayName(user)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
