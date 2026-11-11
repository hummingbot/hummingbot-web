import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { LessonProgressBar } from "@/botcamp/components/learn/LessonProgressBar"
import {
  accentForLevel,
  labelForLevel,
  type CourseLevel,
} from "@/botcamp/lib/course-level"

/**
 * Compact row presentation of a course — used in dashboard "Continue
 * Learning" lists and other narrow surfaces where the full `CourseCard`
 * is too heavy. Shares the same level accent vocabulary so the two
 * presentations feel like one product.
 */
interface CourseListItemProps {
  slug: string
  title: string
  level?: CourseLevel | null
  thumbnail?: string | null
  /** Free-form meta line — e.g. "26 lessons" or "26 lessons · 4h 36m". */
  meta?: string
  /** Override the click target. Defaults to `/courses/<slug>/learn`. */
  href?: string
  /** Omit both to hide the progress bar (e.g. courses not yet started). */
  completedCount?: number
  totalLessons?: number
}

export function CourseListItem({
  slug,
  title,
  level,
  thumbnail,
  meta,
  href,
  completedCount,
  totalLessons,
}: CourseListItemProps) {
  const accent = accentForLevel(level)
  const levelLabel = labelForLevel(level)

  return (
    <Link
      href={href ?? `/courses/${slug}/learn`}
      className="group flex items-center justify-between gap-4 p-4 rounded-bc-lg border border-border hover:border-primary/40 hover:bg-card/60 transition-colors"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-12 h-12 flex-none rounded overflow-hidden bg-muted">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          {levelLabel && (
            <p
              className={cn(
                "font-mono text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5",
                accent,
              )}
            >
              {levelLabel}
            </p>
          )}
          <h3 className="font-semibold truncate">{title}</h3>
          {meta && (
            <p className="text-sm text-muted-foreground truncate">{meta}</p>
          )}
          {totalLessons != null && (
            <LessonProgressBar
              completedCount={completedCount ?? 0}
              totalLessons={totalLessons}
              showPercent={false}
              className="mt-2 max-w-[10rem]"
            />
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 flex-none text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}
