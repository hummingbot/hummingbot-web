// Course difficulty levels — single source of truth for label + accent
// color across CourseCard, course detail page, and marketing surfaces.

export type CourseLevel = "BASIC" | "INTERMEDIATE" | "ADVANCED"

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  BASIC: "Basic",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
}

export const LEVEL_ACCENT: Record<CourseLevel, string> = {
  BASIC: "text-emerald-500 dark:text-emerald-400",
  INTERMEDIATE: "text-amber-500 dark:text-amber-400",
  ADVANCED: "text-fuchsia-500 dark:text-fuchsia-400",
}

export function accentForLevel(level?: CourseLevel | null): string {
  if (!level) return "text-primary"
  return LEVEL_ACCENT[level] ?? "text-primary"
}

export function labelForLevel(level?: CourseLevel | null): string {
  if (!level) return ""
  return LEVEL_LABEL[level] ?? ""
}
