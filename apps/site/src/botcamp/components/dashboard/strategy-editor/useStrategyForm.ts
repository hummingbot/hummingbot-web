"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Visibility } from "@/botcamp/types"
import type { HackathonApplyInfo, HackathonEditInfo, Strategy, StrategyType, UseStrategyFormReturn } from "./types"

// Support both existing strategy (edit mode) and null (create mode)
type StrategyInput = Strategy | (Omit<Strategy, "id" | "slug"> & { id: null; slug: null })

export function useStrategyForm(
  strategy: StrategyInput,
  hackathonEdit: HackathonEditInfo = { kind: "none" },
  // Read-only preview: what Botcamp fetches on mount from /api/strategies/options
  // and /api/user/hackathon-apply-eligibility, read on the server instead.
  preload: { options: { tags: string[]; exchanges: string[] }; hackathonApply: HackathonApplyInfo | null } = {
    options: { tags: [], exchanges: [] },
    hackathonApply: null,
  },
): UseStrategyFormReturn {
  const router = useRouter()
  const isCreateMode = strategy.id === null

  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCertifying, setIsCertifying] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)

  // Alert states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Dialog states
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showCertifyDialog, setShowCertifyDialog] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [showApplyHackathonDialog, setShowApplyHackathonDialog] = useState(false)

  // Whether there's an open hackathon this strategy could be applied to
  const [hackathonApply] = useState<HackathonApplyInfo | null>(preload.hackathonApply)

  // Form field states
  const [title, setTitleState] = useState(strategy.title || "")
  const [titleErrorMessage, setTitleErrorMessage] = useState<string | null>(null)

  const setTitle = (value: string) => {
    setTitleState(value)
    if (value.trim()) setTitleErrorMessage(null)
  }
  const [summary, setSummary] = useState(strategy.summary || "")
  const [details, setDetails] = useState(strategy.details || "")
  const [strategyType, setStrategyType] = useState<StrategyType>(strategy.strategyType)
  const [videoURL, setVideoURL] = useState(strategy.videoURL || "")
  const [tags, setTags] = useState<string[]>(strategy.tags)
  const [exchanges, setExchanges] = useState<string[]>(strategy.exchanges)
  const [visibility, setVisibility] = useState<Visibility>(strategy.visibility)
  const [files, setFiles] = useState(strategy.files)
  const [images, setImages] = useState(strategy.images)

  // Unsaved-changes tracking: compare the form against what was last saved so
  // leaving the page with pending edits asks first instead of dropping them.
  // Files and images save on upload, so they aren't part of this.
  const currentSnapshot = JSON.stringify({ title, summary, details, strategyType, videoURL, tags, exchanges, visibility })
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot)
  const isDirty = currentSnapshot !== savedSnapshot

  useEffect(() => {
    if (!isDirty) return
    // Reload, close tab, or an external URL.
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    // In-app links (sidebar, header, breadcrumbs) navigate client-side and
    // never fire beforeunload. Capturing at the document runs before Next's
    // Link handler, which skips navigation once the event is prevented.
    const confirmLeave = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor || anchor.target === "_blank") return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", warn)
    document.addEventListener("click", confirmLeave, true)
    return () => {
      window.removeEventListener("beforeunload", warn)
      document.removeEventListener("click", confirmLeave, true)
    }
  }, [isDirty])

  // Suggestions
  const [tagSuggestions] = useState<string[]>(preload.options.tags)
  const [exchangeSuggestions] = useState<string[]>(preload.options.exchanges)

  // Permissions
  // A running hackathon overrides the certification rule: agents selected for
  // the finals stay editable until the finals code freeze; every other submitted entry
  // locks once submissions close. The server enforces the same rule
  // (lib/strategy-edit).
  const canEditContent =
    isCreateMode ||
    hackathonEdit.kind === "selected" ||
    (hackathonEdit.kind !== "locked" &&
      ["DRAFT", "SUBMITTED", "CHANGES_REQUESTED", "APPROVED"].includes(strategy.status))
  // Matches the API: certified strategies, and agents once a version is approved.
  const canChangeVisibility =
    !isCreateMode &&
    (strategy.status === "CERTIFIED" || (strategy.strategyType === "AGENT" && !!strategy.hasApprovedAgentVersion))
  // Certifying is the cohort's last step; an agent's approval is Condor's review.
  const canCertify = !isCreateMode && strategy.status === "APPROVED" && strategy.strategyType !== "AGENT"
  const isCertified = !isCreateMode && strategy.status === "CERTIFIED"

  // Handlers
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  const requireTitle = (message: string) => {
    if (title.trim()) return true
    setTitleErrorMessage("Strategy name is required")
    setError(message)
    scrollToTop()
    return false
  }

  const handleOpenSubmitDialog = () => {
    if (requireTitle("Please enter a strategy name before submitting.")) {
      setShowSubmitDialog(true)
    }
  }

  const handleSave = async () => {
    if (!requireTitle("Please enter a strategy name before saving.")) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isCreateMode) {
        // Create new strategy
        const response = await fetch("/api/user/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            summary: summary || null,
            details: details || null,
            strategyType,
            videoURL: videoURL || null,
            tags,
            exchanges,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to create strategy")
        }

        const newStrategy = await response.json()
        setSavedSnapshot(currentSnapshot)
        setSuccess("Strategy created successfully")
        // Redirect to edit page with new ID
        router.replace(`/dashboard/strategies/${newStrategy.id}`)
      } else {
        // Update existing strategy
        const response = await fetch(`/api/user/strategies/${strategy.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: canEditContent ? title : undefined,
            summary: summary || null,
            details: details || null,
            strategyType: canEditContent ? strategyType : undefined,
            videoURL: canEditContent ? (videoURL || null) : undefined,
            tags: canEditContent ? tags : undefined,
            exchanges: canEditContent ? exchanges : undefined,
            visibility: canChangeVisibility ? visibility : undefined,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to save strategy")
        }

        setSavedSnapshot(currentSnapshot)
        setSuccess("Strategy saved successfully")
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!requireTitle("Please enter a strategy name before submitting.")) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/user/strategies/${strategy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary || null,
          details: details || null,
          strategyType,
          videoURL: videoURL || null,
          tags,
          exchanges,
          submitForReview: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit strategy")
      }

      setSavedSnapshot(currentSnapshot)
      setSuccess("Strategy submitted for review!")
      setShowSubmitDialog(false)
      // Submitting for review only sends the strategy into the admin
      // certification queue — it does not apply it to a hackathon. Prompt
      // separately if there's an open hackathon this could go to.
      if (hackathonApply) setShowApplyHackathonDialog(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCertify = async () => {
    setIsCertifying(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/user/strategies/${strategy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certify: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to certify strategy")
      }

      setSuccess("Strategy certified! You are now certified.")
      setShowCertifyDialog(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsCertifying(false)
    }
  }

  const handleDiscard = async () => {
    if (isCreateMode) {
      // Just navigate back for new strategies
      router.push("/dashboard/strategies")
      return
    }

    setIsDiscarding(true)
    setError(null)

    try {
      const response = await fetch(`/api/user/strategies/${strategy.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete strategy")
      }

      router.push("/dashboard/strategies")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsDiscarding(false)
      setShowDiscardDialog(false)
    }
  }

  return {
    state: {
      title,
      summary,
      details,
      strategyType,
      videoURL,
      tags,
      exchanges,
      visibility,
      files,
      images,
    },
    actions: {
      setTitle,
      setSummary,
      setDetails,
      setStrategyType,
      setVideoURL,
      setTags,
      setExchanges,
      setVisibility,
      setFiles,
      setImages,
    },
    handlers: {
      handleSave,
      handleOpenSubmitDialog,
      handleSubmitForReview,
      handleCertify,
      handleDiscard,
    },
    loading: {
      isLoading,
      isSubmitting,
      isCertifying,
      isDiscarding,
    },
    dialogs: {
      showSubmitDialog,
      setShowSubmitDialog,
      showCertifyDialog,
      setShowCertifyDialog,
      showDiscardDialog,
      setShowDiscardDialog,
      showApplyHackathonDialog,
      setShowApplyHackathonDialog,
    },
    permissions: {
      canEditContent,
      canChangeVisibility,
      canCertify,
      isCertified,
    },
    alerts: {
      error,
      success,
      titleErrorMessage,
    },
    suggestions: {
      tagSuggestions,
      exchangeSuggestions,
    },
    hackathonApply,
  }
}
