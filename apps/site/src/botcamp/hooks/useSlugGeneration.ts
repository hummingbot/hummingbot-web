"use client"

import { useCallback } from "react"

/**
 * Generate a URL-safe slug from a string
 */
export function generateSlug(text: string, prefix?: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  return prefix ? `${prefix}-${slug}` : slug
}

/**
 * Generate a cohort-prefixed slug
 */
export function generateCohortSlug(title: string, cohortNumber?: number): string {
  const slug = generateSlug(title)
  return cohortNumber ? `cohort-${cohortNumber}-${slug}` : slug
}

/**
 * Hook for auto-generating slugs from titles
 */
export function useSlugGeneration(options?: {
  prefix?: string
  cohortNumber?: number
}) {
  const { prefix, cohortNumber } = options || {}

  const createSlug = useCallback(
    (title: string): string => {
      if (cohortNumber !== undefined) {
        return generateCohortSlug(title, cohortNumber)
      }
      return generateSlug(title, prefix)
    },
    [prefix, cohortNumber]
  )

  return { createSlug, generateSlug, generateCohortSlug }
}
