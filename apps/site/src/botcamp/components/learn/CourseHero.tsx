import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BookOpen, Clock, Layers, PlayCircle } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { accentForLevel, labelForLevel, type CourseLevel } from "@/botcamp/lib/course-level"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import { LessonProgressBar } from "@/botcamp/components/learn/LessonProgressBar"

interface CourseHeroProps {
  title: string
  description?: string | null
  thumbnail?: string | null
  level?: CourseLevel | null
  /** Headline meta items — modules, lessons, duration, etc. */
  stats: Array<{ icon: typeof BookOpen; label: string }>
  /** Primary CTA — Start the course / Continue learning / Sign up to enroll / etc.
   *  Ignored when {@link ctaSlot} is provided. */
  cta: {
    label: string
    href?: string
    /** When provided, render as a non-link button (used by enroll flows). */
    onClick?: () => void
  }
  /** Replace the default CTA pill with a custom element (e.g. the
   *  client-side `FreeEnrollButton` that routes through auth/enroll). */
  ctaSlot?: React.ReactNode
  /** Optional secondary CTA below the primary. */
  secondaryCta?: {
    label: string
    href: string
  } | null
  /** Enrolled progress — shown as a bar + percentage above the CTA. */
  progress?: {
    completedCount: number
    totalLessons: number
  } | null
}

/**
 * Compass-inspired hero: course cover image fills the band; dark
 * gradient overlays fade the image out on the left (so the title
 * column reads) and at the bottom (so it transitions cleanly into
 * the rest of the page). Content sits in a max-w-2xl column over
 * the gradient.
 */
export function CourseHero({
  title,
  description,
  thumbnail,
  level,
  stats,
  cta,
  ctaSlot,
  secondaryCta,
  progress,
}: CourseHeroProps) {
  const accent = accentForLevel(level)
  const levelLabel = labelForLevel(level)
  const hasCover = !!thumbnail

  return (
    <div className="relative">
      {/* Hero image band — sits behind the content column. Image fills
          the band; two gradient overlays layer above it to keep the
          left/bottom of the band readable for text. */}
      <div className="absolute inset-0 overflow-hidden">
        {hasCover ? (
          <Image
            src={thumbnail!}
            alt={title}
            fill
            sizes="100vw"
            priority
            className="object-cover object-center"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={getAvatarGradient(title)}
          />
        )}
        {/* Left fade — title column reads cleanly */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
        {/* Bottom fade — band transitions into the section list below */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Foreground content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl pt-32 pb-12 sm:pt-40 lg:py-24">
          <div className="flex items-center gap-3 mb-5">
            <PlayCircle className="h-8 w-8 text-foreground" strokeWidth={1.5} />
            <h1 className="text-3xl md:text-4xl font-bold tracking-bc-tight text-foreground leading-tight">
              {title}
            </h1>
          </div>

          {levelLabel && (
            <p
              className={cn(
                "font-mono text-[10px] font-bold uppercase tracking-[0.18em] mb-4",
                accent,
              )}
            >
              {levelLabel}
            </p>
          )}

          {description && (
            <p className="text-base leading-7 text-muted-foreground mb-7 max-w-lg">
              {description}
            </p>
          )}

          {stats.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-foreground mb-9">
              {stats.map((stat, i) => {
                const Icon = stat.icon
                return (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 [&:not(:last-child)]:after:content-['·'] [&:not(:last-child)]:after:text-foreground/25 [&:not(:last-child)]:after:ml-4 [&:not(:last-child)]:after:hidden sm:[&:not(:last-child)]:after:inline"
                  >
                    <Icon
                      className="h-4 w-4 text-foreground/40"
                      strokeWidth={1.5}
                    />
                    {stat.label}
                  </span>
                )
              })}
            </div>
          )}

          {progress && progress.totalLessons > 0 && (
            <LessonProgressBar
              completedCount={progress.completedCount}
              totalLessons={progress.totalLessons}
              className="mb-7 max-w-xs"
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            {ctaSlot ?? (
              cta.href ? (
                <Link
                  href={cta.href}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background hover:bg-foreground/85 transition-colors"
                >
                  <PlayCircle className="h-4 w-4" strokeWidth={2} />
                  {cta.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={cta.onClick}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background hover:bg-foreground/85 transition-colors"
                >
                  <PlayCircle className="h-4 w-4" strokeWidth={2} />
                  {cta.label}
                </button>
              )
            )}

            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {secondaryCta.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Convenience icon set so callers don't import lucide-react directly.
export const heroStatIcons = {
  modules: Layers,
  lessons: BookOpen,
  duration: Clock,
}
