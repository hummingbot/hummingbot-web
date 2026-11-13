import { LessonRow } from "./LessonRow"
import type { LearnGroup, ResourceKind } from "./types"

interface SectionListProps {
  groups: LearnGroup[]
  resourceKind: ResourceKind
  /** Course slug or cohort number string. */
  resourceSlug: string
  /** Whether the viewer is entitled to all lessons. When false, only
   *  lessons flagged `isFree` are clickable; the rest render locked. */
  hasAccess?: boolean
}

/**
 * Compass-style 2-column section listing for course / cohort overviews.
 * Left rail = "Part N" (or "Week N") label with a black ticker mark.
 * Right column = section title + description + lesson rows.
 *
 * Each section sits on its own subtle border-top, so the page reads as
 * a stack of evenly-spaced parts.
 */
export function SectionList({
  groups,
  resourceKind,
  resourceSlug,
  hasAccess = true,
}: SectionListProps) {
  const basePath =
    resourceKind === "course"
      ? `/courses/${resourceSlug}/learn`
      : `/cohorts/cohort${resourceSlug}/learn`
  const groupLabel = resourceKind === "course" ? "Part" : "Week"

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-y-16 pb-16">
          {groups.map((group, groupIndex) => {
            const number = group.number ?? groupIndex + 1
            return (
              <section
                key={group.id}
                className="grid grid-cols-4 border-t border-border"
              >
                {/* Part rail — black ticker overlapping the gray border */}
                <div className="col-span-full sm:col-span-1">
                  <div className="-mt-px inline-flex border-t border-foreground pt-px">
                    <p className="pt-4 text-sm font-semibold text-foreground sm:pt-10">
                      {groupLabel} {number}
                    </p>
                  </div>
                </div>

                {/* Right content */}
                <div className="col-span-full sm:col-span-3 pt-6 sm:pt-10">
                  <div className="max-w-2xl">
                    <h2 className="text-2xl font-medium tracking-bc-tight text-foreground leading-snug">
                      {group.title}
                    </h2>
                    {group.description && (
                      <p className="mt-4 text-sm leading-7 text-muted-foreground">
                        {group.description}
                      </p>
                    )}
                    <div className="mt-6 space-y-4">
                      {group.lessons.map((lesson) => (
                        <LessonRow
                          key={lesson.id}
                          lesson={lesson}
                          href={`${basePath}/${lesson.slug}`}
                          hasAccess={hasAccess}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
