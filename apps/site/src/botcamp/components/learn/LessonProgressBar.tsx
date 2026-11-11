import { CheckCircle2 } from "lucide-react"
import { Progress } from "@/botcamp/components/ui/progress"
import { cn } from "@/botcamp/lib/utils"

interface LessonProgressBarProps {
  completedCount: number
  totalLessons: number
  /** Show the "73%" label next to the bar. Off for surfaces (like
   *  `CourseListItem`) that already show a lesson count elsewhere. */
  showPercent?: boolean
  className?: string
}

/**
 * Progress bar for a course/cohort enrollment — or, once every lesson is
 * done, a "Completed" checkmark in its place. Completeness is driven by the
 * raw counts (never the rounded percent) so a course that's merely 99%
 * rounded up never reads as finished.
 */
export function LessonProgressBar({
  completedCount,
  totalLessons,
  showPercent = true,
  className,
}: LessonProgressBarProps) {
  if (totalLessons === 0) return null

  if (completedCount === totalLessons) {
    return (
      <p className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-success", className)}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </p>
    )
  }

  const percent = Math.round((completedCount / totalLessons) * 100)
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress value={percent} className="h-1.5" />
      {showPercent && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {percent}%
        </span>
      )}
    </div>
  )
}
