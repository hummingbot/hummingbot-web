"use client"

import { AppShell } from "@/botcamp/components/layout/AppShell"
import { LearnSidebar } from "./LearnSidebar"
import { LessonProgressProvider } from "./LessonProgressContext"
import type { BreadcrumbCrumb, LearnGroup, ResourceKind } from "./types"

interface LearnShellProps {
  groups: LearnGroup[]
  resourceKind: ResourceKind
  resourceSlug: string
  /** Whether the viewer is entitled to all lessons (enrolled, admin,
   *  instructor). Passed through to the sidebar so non-free lessons
   *  render locked for unentitled viewers. */
  hasAccess: boolean
  /** Start with the persistent sidebar collapsed at xl+ (overview pages). */
  initialCollapsed?: boolean
  crumbs: BreadcrumbCrumb[]
  /** Resource (course/cohort) name shown bold in the sidebar's top-left. */
  title?: string
  children: React.ReactNode
}

/**
 * Botcamp's learn shell (outline sidebar + breadcrumb header), on the same
 * chrome as the dashboard preview: AppShell keeps this site's SiteHeader on
 * top and puts the sidebar toggle + breadcrumb (Botcamp's LearnHeader) in a
 * slim bar under it, with the read-only notice. The lesson outline is
 * Botcamp's LearnSidebar, unchanged.
 */
export function LearnShell({
  groups,
  resourceKind,
  resourceSlug,
  hasAccess,
  initialCollapsed = false,
  crumbs,
  title,
  children,
}: LearnShellProps) {
  return (
    <LessonProgressProvider>
      <AppShell
        crumbs={crumbs}
        initialCollapsed={initialCollapsed}
        fullBleed
        renderSidebar={({ onToggle, onNavigate }) => (
          <div className="w-full">
            <LearnSidebar
              groups={groups}
              resourceKind={resourceKind}
              resourceSlug={resourceSlug}
              hasAccess={hasAccess}
              title={title}
              onLessonClick={onNavigate}
              onToggle={onToggle}
            />
          </div>
        )}
      >
        {children}
      </AppShell>
    </LessonProgressProvider>
  )
}
