"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, GraduationCap, PlayCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface EnrollFreeCourseCardProps {
  courseId: string
  courseSlug: string
  title: string
}

/**
 * Dashboard CTA prompting non-enrolled users into the free intro course.
 * One click enrolls (POST /api/enrollments) and drops them into the lessons.
 * Only rendered server-side when the user isn't already enrolled.
 */
export function EnrollFreeCourseCard({
  courseId,
  courseSlug,
  title,
}: EnrollFreeCourseCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEnroll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to enroll")
      }
      router.push(`/courses/${courseSlug}/learn`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll")
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-cyan-500/15 to-transparent border-cyan-500/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bc-md bg-cyan-500/15 text-cyan-400">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Start with {title}</CardTitle>
            <CardDescription>
              Free · 4+ hours of lessons, quizzes, and coding challenges
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-bc-3">
        <p className="text-sm text-muted-foreground">
          Learn the fundamentals of algorithmic trading and Hummingbot — no cost,
          no prerequisites.
        </p>
        <ReadOnlyHint>
        <Button onClick={handleEnroll} disabled>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Enrolling…" : "Enroll for free"}
        </Button>
        </ReadOnlyHint>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
