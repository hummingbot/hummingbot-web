import type { PageSuggestions } from "@/botcamp/lib/agent-page-suggestions"
import type { StrategyStatus, Visibility } from "@/botcamp/types"

export interface FileItem {
  id: string
  filename: string
  size?: number | null
  mimeType?: string | null
  type?: "FILE" | "LINK"
  url?: string | null
  sortOrder?: number
}

export interface ImageItem {
  id: string
  filename: string
  mimeType: string
  size: number
  sortOrder: number
}

export type StrategyType = "AGENT" | "SCRIPT" | "CONTROLLER" | "V1_STRATEGY" | "OTHER"

export interface Strategy {
  id: number
  slug: string
  cohortId: string | null
  title: string
  summary: string | null
  details: string | null
  strategyType: StrategyType
  tags: string[]
  exchanges: string[]
  videoURL: string | null
  status: StrategyStatus
  visibility: Visibility
  files: FileItem[]
  images: ImageItem[]
  cohortRelation?: { number: number } | null
  /** A non-member's page: it can only hold an agent, reviewed per uploaded version. */
  agentApprovalRequired?: boolean
  /** Condor installs it by slug, so the page can't be deleted. */
  hasApprovedAgentVersion?: boolean
  /** The newest uploaded agent version and where its review stands, or null before the first upload. */
  latestAgentVersion?: {
    version: number
    status: string
    /** The admin's note to the author, if any. */
    reviewNote?: string | null
    /** On a rejection, what to fix: file, category, how. */
    feedback?: { path: string; category: string; message: string }[]
  } | null
  /** A reviewer's suggested wording for the page, until the author answers each field. */
  pageSuggestions?: PageSuggestions | null
  authors?: Array<{
    user: {
      id: string
      slug: string | null
      firstName: string | null
      lastName: string | null
    }
  }>
}

// Default values for creating a new strategy
export function getDefaultStrategy(strategyType: StrategyType = "OTHER"): Omit<Strategy, "id" | "slug"> & { id: null; slug: null } {
  return {
    id: null,
    slug: null,
    cohortId: null,
    title: "",
    summary: null,
    details: null,
    strategyType,
    tags: [],
    exchanges: [],
    videoURL: null,
    status: "DRAFT",
    visibility: "PRIVATE",
    files: [],
    images: [],
    cohortRelation: null,
    authors: [],
  }
}

export interface StrategyFormState {
  title: string
  summary: string
  details: string
  strategyType: StrategyType
  videoURL: string
  tags: string[]
  exchanges: string[]
  visibility: Visibility
  files: FileItem[]
  images: ImageItem[]
}

export interface StrategyFormActions {
  setTitle: (value: string) => void
  setSummary: (value: string) => void
  setDetails: (value: string) => void
  setStrategyType: (value: StrategyType) => void
  setVideoURL: (value: string) => void
  setTags: (value: string[]) => void
  setExchanges: (value: string[]) => void
  setVisibility: (value: Visibility) => void
  setFiles: (value: FileItem[]) => void
  setImages: (value: ImageItem[]) => void
}

export interface StrategyFormHandlers {
  handleSave: () => Promise<void>
  handleOpenSubmitDialog: () => void
  handleSubmitForReview: () => Promise<void>
  handleCertify: () => Promise<void>
  handleDiscard: () => Promise<void>
}

export interface StrategyFormLoading {
  isLoading: boolean
  isSubmitting: boolean
  isCertifying: boolean
  isDiscarding: boolean
}

export interface StrategyFormDialogs {
  showSubmitDialog: boolean
  setShowSubmitDialog: (value: boolean) => void
  showCertifyDialog: boolean
  setShowCertifyDialog: (value: boolean) => void
  showDiscardDialog: boolean
  setShowDiscardDialog: (value: boolean) => void
  showApplyHackathonDialog: boolean
  setShowApplyHackathonDialog: (value: boolean) => void
}

// An open hackathon the user is registered for and can still apply this
// strategy to. Null when there's nothing to prompt for (no open hackathon,
// not registered, or the applications-per-hackathon limit is already hit).
export interface HackathonApplyInfo {
  slug: string
  title: string
}

// lib/strategy-edit's HackathonEditState, passed from the server page to the editor.
export type { HackathonEditState as HackathonEditInfo } from "@/botcamp/lib/strategy-edit"

export interface StrategyFormPermissions {
  canEditContent: boolean
  canChangeVisibility: boolean
  canCertify: boolean
  isCertified: boolean
}

export interface StrategyFormAlerts {
  error: string | null
  success: string | null
  titleErrorMessage: string | null
}

export interface StrategyFormSuggestions {
  tagSuggestions: string[]
  exchangeSuggestions: string[]
}

export interface UseStrategyFormReturn {
  state: StrategyFormState
  actions: StrategyFormActions
  handlers: StrategyFormHandlers
  loading: StrategyFormLoading
  dialogs: StrategyFormDialogs
  permissions: StrategyFormPermissions
  alerts: StrategyFormAlerts
  suggestions: StrategyFormSuggestions
  hackathonApply: HackathonApplyInfo | null
}
