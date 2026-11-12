"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckCircle2, CircleDot, Lock, PanelLeft } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { useLessonProgressOverride } from "./LessonProgressContext"
import type { LearnGroup, LearnLesson, ResourceKind } from "./types"

interface LearnSidebarProps {
  groups: LearnGroup[]
  resourceKind: ResourceKind
  /** Resource slug (course) or cohort number string. */
  resourceSlug: string
  /** Whether the viewer is entitled to all lessons (enrolled, admin,
   *  instructor). When false, only lessons flagged `isFree` are
   *  clickable; the rest render as muted, locked rows. */
  hasAccess: boolean
  /** Called after a lesson is clicked (used by overlay to auto-close). */
  onLessonClick?: () => void
  /** Sidebar close/toggle handler — renders a panel-toggle button at
   *  the top of the sidebar when provided. */
  onToggle?: () => void
  /** Resource (course/cohort) name shown bold in the sidebar's top-left. */
  title?: string
}

/**
 * Compass-style outline. Section title in bold, lesson rows underneath
 * with a left-border accent that activates on hover and the current page.
 * No icons in lesson rows — pure typography.
 */
export function LearnSidebar({
  groups,
  resourceKind,
  resourceSlug,
  hasAccess,
  onLessonClick,
  onToggle,
  title,
}: LearnSidebarProps) {
  const pathname = usePathname()
  const basePath =
    resourceKind === "course"
      ? `/courses/${resourceSlug}`
      : `/cohorts/cohort${resourceSlug}`
  const learnPath = `${basePath}/learn`

  return (
    <div>
      {/* Sidebar toggle — anchored to the RIGHT edge of the rail
          (flush with the right border that divides sidebar from main
          content) so the icon sits at the seam in every mode. Top bar
          height matches the header's h-16 so vertical position stays
          aligned with the breadcrumb. */}
      {onToggle && (
        <div className="flex h-16 items-center justify-between gap-2 pl-6 pr-2">
          {title ? (
            <span className="truncate text-base font-bold tracking-bc-tight text-foreground">
              {title}
            </span>
          ) : (
            <span aria-hidden />
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label="Close sidebar"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bc-md hover:bg-card transition-colors text-foreground"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="px-6 pb-6 pt-2">
        {/* Resource title lives in the header breadcrumb; the sidebar
            jumps straight into the outline. */}
        <div className="space-y-8">

          {groups.map((group, groupIndex) => {
          const sectionTitle =
            resourceKind === "cohort"
              ? `Week ${group.number ?? groupIndex + 1}: ${group.title}`
              : group.title
          return (
            <div key={group.id}>
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                {sectionTitle}
              </h3>
              <ul className="mt-3 flex flex-col gap-3 border-l border-border text-sm text-muted-foreground">
                {group.lessons.map((lesson) => {
                  const lessonPath = `${learnPath}/${lesson.slug}`
                  const isActive = pathname === lessonPath
                  const isUnlocked = hasAccess || !!lesson.isFree
                  if (!isUnlocked) {
                    // Locked row — visible but not clickable. Lock icon
                    // signals the gate to the viewer.
                    return (
                      <li key={lesson.id}>
                        <span
                          aria-disabled="true"
                          className="-ml-px flex items-center gap-2 border-l border-transparent pl-4 text-muted-foreground/50"
                        >
                          <Lock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lesson.title}</span>
                        </span>
                      </li>
                    )
                  }
                  return (
                    <SidebarLessonItem
                      key={lesson.id}
                      lesson={lesson}
                      href={lessonPath}
                      isActive={isActive}
                      hasAccess={hasAccess}
                      onClick={onLessonClick}
                    />
                  )
                })}
              </ul>
            </div>
          )
          })}
        </div>
      </div>
    </div>
  )
}

interface SidebarLessonItemProps {
  lesson: LearnLesson
  href: string
  isActive: boolean
  hasAccess: boolean
  onClick?: () => void
}

/** Own component so it can read the live progress override via a hook. */
function SidebarLessonItem({ lesson, href, isActive, hasAccess, onClick }: SidebarLessonItemProps) {
  const progressStatus = useLessonProgressOverride(lesson.id) ?? lesson.progressStatus

  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "-ml-px flex items-center gap-2 border-l pl-4 transition-colors",
          isActive
            ? "border-primary text-foreground font-medium"
            : "border-transparent hover:border-muted-foreground/40 hover:text-foreground",
        )}
      >
        <span className="flex-1 truncate">{lesson.title}</span>
        {progressStatus === "completed" && (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
        )}
        {progressStatus === "in-progress" && (
          <CircleDot className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        )}
        {!hasAccess && lesson.isFree && (
          <span className="shrink-0 rounded-bc-sm bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Free
          </span>
        )}
      </Link>
    </li>
  )
}
