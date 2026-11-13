import { Prisma } from '@prisma/client'

// Base types from Prisma
export type PrismaStudent = Prisma.StudentGetPayload<{
  include: {
    strategies: {
      include: {
        strategy: true
      }
    }
  }
}>

export type PrismaStrategy = Prisma.StrategyGetPayload<{
  include: {
    students: {
      include: {
        student: true
      }
    }
  }
}>

// Application types
export interface Student {
  id: string
  slug: string
  email: string
  firstName: string
  lastName: string
  name: string
  tagline: string | null
  about: string | null
  avatarURL: string | null
  websiteURL: string | null
  linkedin: string | null
  github: string | null
  discord: string | null
  cohorts: number[]
  strategy?: Strategy | null
  strategies?: Array<{ strategy: Strategy }>
}

// Strategy workflow status
export type StrategyStatus = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'CERTIFIED'

// Visibility levels (shared by Strategy and User profiles)
export type Visibility = 'PUBLIC' | 'MEMBERS_ONLY' | 'PRIVATE'

export interface StrategyFile {
  id: string
  strategyId: number
  filename: string
  mimeType: string
  size: number
  sortOrder: number
  createdAt?: Date
  updatedAt?: Date
}

export interface StrategyComment {
  id: string
  strategyId: number
  authorId: string
  content: string
  deletedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
  author?: {
    id: string
    firstName: string | null
    lastName: string | null
    role: string
  }
}

export interface Strategy {
  id: number
  slug: string
  cohortId: string
  title: string
  tags: string[]
  exchanges: string[]
  summary: string | null
  details?: string | null
  videoURL: string | null

  // Workflow fields
  status: StrategyStatus
  visibility: Visibility
  submittedAt?: Date | null
  approvedAt?: Date | null
  approvedById?: string | null
  certifiedAt?: Date | null

  // Relations
  files?: StrategyFile[]
  comments?: StrategyComment[]
  cohortRelation?: { id: string; number: number; slug: string }

  createdAt?: Date
  updatedAt?: Date
  students?: Array<{ student: Student }>
  authors?: Array<{ user: { id: string; firstName: string | null; lastName: string | null; slug: string | null } }>
}

export interface APIResponse<T> {
  data?: T
  error?: string
  code?: string
}

export interface APIErrorResponse {
  error: string
  code?: string
  details?: unknown
}
