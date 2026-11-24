"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/botcamp/components/ui/button"
import { Loader2, ArrowRight } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"

interface CheckoutButtonProps {
  // Resource identification - one of these is required
  cohortId?: string
  courseId?: string

  // Price in cents (0 = free)
  price: number

  // For free courses - redirect after enrollment
  courseSlug?: string
  firstLessonSlug?: string

  // Styling
  disabled?: boolean
  className?: string
  size?: "default" | "sm" | "lg" | "icon"

  // Custom labels
  label?: string
  loadingLabel?: string
}

export function CheckoutButton({
  cohortId,
  courseId,
  price,
  courseSlug,
  firstLessonSlug,
  disabled,
  className,
  size = "lg",
  label,
  loadingLabel = "Processing...",
}: CheckoutButtonProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFree = price === 0
  const isCohort = !!cohortId
  const resourceType = isCohort ? "cohort" : "course"

  // Default labels
  const defaultLabel = isFree
    ? session
      ? "Enroll Free"
      : "Sign Up to Enroll"
    : `Enroll Now - $${(price / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`

  const buttonLabel = label || defaultLabel

  const handleClick = async () => {
    // Free course - handle differently
    if (isFree && courseId) {
      if (!session) {
        const callbackUrl = encodeURIComponent(`/courses/${courseSlug}`)
        router.push(`/signup?callbackUrl=${callbackUrl}`)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to enroll")
        }

        // Redirect to course content
        const learnUrl = `/courses/${courseSlug}/learn${firstLessonSlug ? `/${firstLessonSlug}` : ""}`
        router.push(learnUrl)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        setIsLoading(false)
      }
      return
    }

    // Paid checkout flow
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cohortId ? { cohortId } : { courseId }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to signup with callback URL
          const callbackUrl = encodeURIComponent(window.location.pathname)
          router.push(`/signup?callbackUrl=${callbackUrl}`)
          return
        }
        throw new Error(data.error || "Failed to create checkout session")
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (err) {
      console.error("Checkout error:", err)
      setError(err instanceof Error ? err.message : `Failed to start ${resourceType} checkout`)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Button
        onClick={handleClick}
        disabled={disabled || isLoading}
        size={size}
        className={cn("w-full", className)}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingLabel}
          </>
        ) : (
          <>
            {buttonLabel}
            {!isFree && <ArrowRight className="ml-2 h-5 w-5" />}
          </>
        )}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
