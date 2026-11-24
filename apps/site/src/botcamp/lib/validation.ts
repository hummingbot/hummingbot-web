import { z } from 'zod'

// Control characters (e.g. a stray null byte from some mobile autofill/paste
// flows) pass most "is this blank" checks but crash Postgres with
// "invalid byte sequence for encoding UTF8" once they reach a query param.
const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/

export function hasControlCharacters(value: string): boolean {
  return CONTROL_CHAR_REGEX.test(value)
}

// Student validation schemas
export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional().nullable().or(z.literal('')),
  email: z.string().email('Invalid email address'),
  tagline: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  avatarURL: z.string().url('Invalid avatar URL').optional().nullable().or(z.literal('')),
  websiteURL: z.string().url('Invalid Website URL').optional().nullable().or(z.literal('')),
  linkedin: z.string().url('Invalid LinkedIn URL').optional().nullable().or(z.literal('')),
  github: z.string().optional().nullable(),
  discord: z.string().optional().nullable(),
  cohorts: z.array(z.number()).default([]),
  strategyId: z.number().optional().nullable(),
})

export const updateStudentSchema = createStudentSchema.partial().extend({
  id: z.string().optional(),
})

// Strategy workflow status enum
export const strategyStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'])

// Visibility enum (shared by Strategy and User profiles)
export const visibilityEnum = z.enum(['PUBLIC', 'MEMBERS_ONLY', 'PRIVATE'])

// Strategy validation schemas
export const createStrategySchema = z.object({
  cohortId: z.string().min(1, 'Cohort is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  videoURL: z.string().url('Invalid video URL').optional().nullable().or(z.literal('')),
  tags: z.array(z.string()).optional().default([]),
  exchanges: z.array(z.string()).optional().default([]),
  // Workflow fields
  status: strategyStatusEnum.default('DRAFT'),
  visibility: visibilityEnum.default('PRIVATE'),
  // Legacy
  studentIds: z.array(z.string()).optional(),
})

export const updateStrategySchema = createStrategySchema.partial().extend({
  id: z.number().optional(),
})

// Helper type inference
export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>
export type CreateStrategyInput = z.infer<typeof createStrategySchema>
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>

// Profile fields shown as links (website, LinkedIn, GitHub, Discord, story).
// A bare handle ("ada-l") is fine; anything carrying a scheme must be http(s)
// — never javascript:, data: or the like — and short enough to be a link.
export const PROFILE_LINK_FIELDS = ["websiteUrl", "linkedin", "github", "discord", "storyUrl"] as const
const MAX_PROFILE_LINK_LENGTH = 500

export function isSafeProfileLink(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true
  if (typeof value !== "string" || value.length > MAX_PROFILE_LINK_LENGTH || hasControlCharacters(value)) return false
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value.trim())) return true
  try {
    return ["http:", "https:"].includes(new URL(value.trim()).protocol)
  } catch {
    return false
  }
}

/** A parsed JSON body that is an object — not null, an array or a primitive. */
export function isJsonObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** The first profile link field in `body` that isn't safe, if any. */
export function unsafeProfileLink(body: Record<string, unknown>): string | null {
  return PROFILE_LINK_FIELDS.find((field) => field in body && !isSafeProfileLink(body[field])) ?? null
}

