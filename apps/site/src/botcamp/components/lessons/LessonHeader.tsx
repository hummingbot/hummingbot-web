import Link from "next/link"
import { Badge } from "@/botcamp/components/ui/badge"
import { LessonTypeBadge } from "@/botcamp/components/ui/lesson-type-badge"
import { Clock, ChevronLeft } from "lucide-react"
import { formatDuration } from "@/botcamp/lib/format"

interface LessonHeaderProps {
  title: string
  type: string
  duration: number | null
  isFree?: boolean
  breadcrumb: string
  /** URL to navigate back (e.g., /cohorts/cohort13 or /courses/course-slug) */
  backUrl?: string
}

export function LessonHeader({
  title,
  type,
  duration,
  isFree,
  breadcrumb,
  backUrl,
}: LessonHeaderProps) {
  return (
    <div className="mb-8">
      {backUrl && (
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {breadcrumb}
        </Link>
      )}
      {!backUrl && (
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          {breadcrumb}
        </p>
      )}

      <h1 className="text-2xl md:text-4xl font-bold tracking-bc-tight leading-tight mb-4">
        {title}
      </h1>

      <div className="flex flex-wrap items-center gap-3">
        <LessonTypeBadge type={type} />
        {duration && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(duration)}</span>
          </div>
        )}
        {isFree && <Badge variant="secondary">Free</Badge>}
      </div>
    </div>
  )
}
