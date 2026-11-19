"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, PlayCircle } from "lucide-react"
import { formatPriceCents } from "@/botcamp/lib/format"

interface EnrollPillButtonProps {
  courseId: string
  courseSlug: string
  /** Price in cents — 0 means free. */
  price: number
  firstLessonSlug?: string
}

/**
 * Hero-pill-styled enroll CTA. Uses the primary color so it reads as
 * the page's main action. Resolves the right flow based on auth +
 * price so the user never gets bounced by a downstream gate:
 *
 * - Not logged in → /signup?callbackUrl=… (returns here after signup).
 * - Logged in + free course → POST /api/enrollments → push to first lesson.
 * - Logged in + paid course → POST /api/checkout → redirect to Stripe.
 */
export function FreeEnrollButton({
  courseId,
  courseSlug,
  price,
  firstLessonSlug,
}: EnrollPillButtonProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFree = price === 0

  const pillClasses =
    "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"

  if (status === "loading") {
    return (
      <button type="button" disabled className={pillClasses}>
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        Loading…
      </button>
    )
  }

  if (!session) {
    return (
      <Link
        href={`/signup?callbackUrl=${encodeURIComponent(`/courses/${courseSlug}`)}`}
        className={pillClasses}
      >
        <PlayCircle className="h-4 w-4" strokeWidth={2} />
        {isFree ? "Sign up to enroll" : `Sign up to enroll — ${formatPriceCents(price)}`}
      </Link>
    )
  }

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (isFree) {
        const res = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to enroll")
        }
        const learnUrl = firstLessonSlug
          ? `/courses/${courseSlug}/learn/${firstLessonSlug}`
          : `/courses/${courseSlug}/learn`
        router.push(learnUrl)
        router.refresh()
        return
      }
      // Paid — kick off a Stripe checkout session.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout")
      }
      if (!data.url) {
        throw new Error("Checkout session missing redirect URL")
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={pillClasses}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        ) : (
          <PlayCircle className="h-4 w-4" strokeWidth={2} />
        )}
        {isLoading
          ? isFree
            ? "Enrolling…"
            : "Starting checkout…"
          : isFree
            ? "Enroll for free"
            : `Enroll · ${formatPriceCents(price)}`}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
