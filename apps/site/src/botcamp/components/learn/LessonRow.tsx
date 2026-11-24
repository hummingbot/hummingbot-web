"use client"

import Link from "next/link"
import { CheckCircle2, CircleDot, Code, FileText, HelpCircle, Lock, PlayCircle } from "lucide-react"
import { formatDuration } from "@/botcamp/lib/format"
import { cn } from "@/botcamp/lib/utils"
import { useLessonProgressOverride } from "./LessonProgressContext"
import type { LearnLesson } from "./types"

const ICONS = {
  VIDEO: PlayCircle,
  ARTICLE: FileText,
  QUIZ: HelpCircle,
  CHALLENGE: Code,
} as const

interface LessonRowProps {
  lesson: LearnLesson
  /** Full href to the lesson. */
  href: string
  /** Whether the viewer is entitled to all lessons (enrolled / admin /
   *  instructor). When false, non-free lessons render locked and are
   *  not clickable. */
  hasAccess?: boolean
}

/**
 * Compass lesson row: type icon + title + duration.
 * No card chrome — pure typography with a faint hover background.
 * Used inside SectionList on overview pages.
 */
export function LessonRow({ lesson, href, hasAccess = true }: LessonRowProps) {
  const Icon =
    ICONS[lesson.type as keyof typeof ICONS] ?? FileText
  const duration = lesson.duration != null ? formatDuration(lesson.duration) : null
  const isUnlocked = hasAccess || !!lesson.isFree
  const progressStatus = useLessonProgressOverride(lesson.id) ?? lesson.progressStatus

  const body = (
    <>
      <div className="flex shrink-0 items-center pt-[3px] leading-none">
        {!isUnlocked ? (
          <Lock className="h-4 w-4 text-foreground/30" strokeWidth={1.75} />
        ) : progressStatus === "completed" ? (
          <CheckCircle2
            className="h-4 w-4 text-green-500"
            strokeWidth={1.75}
          />
        ) : progressStatus === "in-progress" ? (
          <CircleDot
            className="h-4 w-4 text-amber-500"
            strokeWidth={1.75}
          />
        ) : (
          <Icon
            className="h-4 w-4 text-foreground/60 group-hover:text-primary transition-colors"
            strokeWidth={1.75}
          />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span
            className={cn(
              "font-semibold transition-colors",
              isUnlocked
                ? "text-foreground group-hover:text-primary"
                : "text-foreground/40",
            )}
          >
            {lesson.title}
          </span>
          {!hasAccess && lesson.isFree && (
            <span className="rounded-bc-sm bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Free preview
            </span>
          )}
          {duration && (
            <>
              <span
                className={cn(
                  "hidden sm:inline",
                  isUnlocked ? "text-foreground/25" : "text-foreground/15",
                )}
              >
                ·
              </span>
              <span
                className={cn(
                  "hidden sm:inline",
                  isUnlocked ? "text-muted-foreground" : "text-foreground/30",
                )}
              >
                {duration}
              </span>
            </>
          )}
        </div>
        {duration && (
          <p
            className={cn(
              "sm:hidden mt-0.5",
              isUnlocked ? "text-muted-foreground" : "text-foreground/30",
            )}
          >
            {duration}
          </p>
        )}
      </div>
    </>
  )

  if (!isUnlocked) {
    return (
      <div
        aria-disabled="true"
        className="-mx-3 -my-2 flex gap-3 rounded-bc-xl px-3 py-2 text-sm cursor-not-allowed"
      >
        {body}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        "group -mx-3 -my-2 flex gap-3 rounded-bc-xl px-3 py-2 text-sm",
        "hover:bg-foreground/5 transition-colors",
      )}
    >
      {body}
    </Link>
  )
}
