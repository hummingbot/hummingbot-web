import Image from "next/image"
import Link from "next/link"
import { CheckCircle, Clock } from "lucide-react"
import { formatDuration } from "@/botcamp/lib/format"
import { cn } from "@/botcamp/lib/utils"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import { LessonProgressBar } from "@/botcamp/components/learn/LessonProgressBar"
import {
  accentForLevel,
  labelForLevel,
  type CourseLevel,
} from "@/botcamp/lib/course-level"

interface CourseCardProps {
  slug: string
  title: string
  level?: CourseLevel | null
  thumbnail?: string | null
  /** Optional meta — shown on /courses listing, omitted on marketing surfaces. */
  lessonCount?: number
  duration?: number // in minutes
  price?: number // in cents
  isEnrolled?: boolean
  index?: number // for staggered animations
  /**
   * Override the click target. Defaults to `/courses/<slug>` (the marketing
   * page). Dashboard surfaces pass `/courses/<slug>/learn` to send enrolled
   * users straight into the lesson player.
   */
  href?: string
  /** Omit both to hide the progress bar (marketing surfaces, not enrolled). */
  completedCount?: number
  totalLessons?: number
}

export function CourseCard({
  slug,
  title,
  level,
  thumbnail,
  lessonCount,
  duration,
  price,
  isEnrolled,
  index = 0,
  href,
  completedCount,
  totalLessons,
}: CourseCardProps) {
  const accent = accentForLevel(level)
  const levelLabel = labelForLevel(level)
  const hasCover = !!thumbnail
  // Show meta row only when caller provides at least one piece of metadata.
  const hasMeta = lessonCount != null || duration != null || price != null

  return (
    <Link
      href={href ?? `/courses/${slug}`}
      className={cn(
        "group block bg-card rounded-bc-xl border border-border overflow-hidden transition-all animate-in fade-in",
        "hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
        isEnrolled && "border-primary/40",
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
    >
      {/* Cover */}
      <div className="relative aspect-video overflow-hidden">
        {hasCover ? (
          <Image
            src={thumbnail!}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center p-6"
            style={getAvatarGradient(title)}
          >
            <span className="font-mono text-2xl md:text-3xl font-black uppercase tracking-bc-tight text-black/80 text-center leading-tight md:leading-(--text-3xl--line-height)">
              {title}
            </span>
          </div>
        )}
        {isEnrolled && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-xs">
              <CheckCircle className="h-3 w-3" />
              Enrolled
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-bc-2">
        {levelLabel && (
          <p
            className={cn(
              "font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
              accent,
            )}
          >
            {levelLabel}
          </p>
        )}

        <h3 className="text-lg md:text-xl font-bold leading-snug md:leading-(--text-xl--line-height)">
          {title}
        </h3>

        {hasMeta && (
          <div className="flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {duration != null && (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(duration)}
                </>
              )}
              {duration != null && lessonCount != null && " · "}
              {lessonCount != null && `${lessonCount} lessons`}
            </span>
            {!isEnrolled && price === 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary">
                Free
              </span>
            )}
          </div>
        )}

        {totalLessons != null && (
          <LessonProgressBar
            completedCount={completedCount ?? 0}
            totalLessons={totalLessons}
            showPercent={false}
            className="pt-1"
          />
        )}
      </div>
    </Link>
  )
}
