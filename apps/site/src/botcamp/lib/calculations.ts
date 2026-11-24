/**
 * Shared calculation utilities for course metrics and statistics
 */

interface Lesson {
  id?: string
  duration?: number | null
}

interface Section {
  id?: string
  lessons: Lesson[]
}

/**
 * Calculate total number of lessons across all sections
 * @param sections - Array of sections containing lessons
 * @returns Total lesson count
 */
export function calculateTotalLessons(sections: Section[]): number {
  return sections.reduce((acc, section) => acc + section.lessons.length, 0)
}

/**
 * Calculate total duration in minutes across all sections and lessons
 * @param sections - Array of sections containing lessons with durations
 * @returns Total duration in minutes
 */
export function calculateTotalDuration(sections: Section[]): number {
  return sections.reduce(
    (acc, section) =>
      acc +
      section.lessons.reduce(
        (lessonAcc, lesson) => lessonAcc + (lesson.duration || 0),
        0
      ),
    0
  )
}

/**
 * Calculate completion percentage
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @returns Percentage (0-100)
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * Calculate average value from an array of numbers
 * @param values - Array of numbers
 * @returns Average value (or 0 if empty array)
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}
