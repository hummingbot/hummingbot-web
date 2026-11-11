import { prisma } from "@/botcamp/lib/prisma"

/** Fraction of a video that must be watched before a lesson counts as complete. */
export const COMPLETION_THRESHOLD = 0.9

export interface LessonProgressEntry {
  positionSeconds: number
  completed: boolean
}

export type LessonProgressStatus = "in-progress" | "completed"

/**
 * Lesson types with a real client-side "started"/"finished" signal —
 * playing a video (`VideoLesson`), answering and finishing a quiz
 * (`QuizLesson`), revealing the solution on a coding challenge
 * (`ChallengeLesson`). These are never auto-completed just by opening the
 * lesson page; `markLessonComplete` is only called for the rest (ARTICLE,
 * WELCOME), which have no equivalent action to gate on.
 */
export const CLIENT_TRACKED_LESSON_TYPES = ["VIDEO", "QUIZ", "CHALLENGE"] as const

/** Set of lesson IDs (from `lessonIds`) the user has completed. */
export async function getCompletedLessonIds(
  userId: string | undefined,
  lessonIds: string[],
): Promise<Set<string>> {
  if (!userId || lessonIds.length === 0) return new Set()
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds }, completedAt: { not: null } },
    select: { lessonId: true },
  })
  return new Set(rows.map((r) => r.lessonId))
}

/**
 * Last-activity timestamp per lesson ID (from `LessonProgress.updatedAt` —
 * a video reporting playback or a quiz being answered, not just a page
 * view). Used to rank a user's enrollments by real recent activity instead
 * of when they enrolled.
 */
export async function getLastActivityByLessonId(
  userId: string | undefined,
  lessonIds: string[],
): Promise<Map<string, Date>> {
  if (!userId || lessonIds.length === 0) return new Map()
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true, updatedAt: true },
  })
  return new Map(rows.map((r) => [r.lessonId, r.updatedAt]))
}

/**
 * Status ("in-progress" or "completed") for `lessonIds`, keyed by lesson
 * ID — a lesson with no entry hasn't been started. A row's mere existence
 * means playback has started (the player reports progress the moment it
 * starts playing, not just once finished — see `useLessonVideoProgress`),
 * so any row without `completedAt` is "in-progress".
 */
export async function getLessonProgressStatuses(
  userId: string | undefined,
  lessonIds: string[],
): Promise<Map<string, LessonProgressStatus>> {
  if (!userId || lessonIds.length === 0) return new Map()
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true, completedAt: true },
  })
  return new Map(
    rows.map((r) => [r.lessonId, r.completedAt ? "completed" : "in-progress"]),
  )
}

/** Progress (position + completed) for `lessonIds`, keyed by lesson ID. */
export async function getLessonProgressMap(
  userId: string | undefined,
  lessonIds: string[],
): Promise<Map<string, LessonProgressEntry>> {
  if (!userId || lessonIds.length === 0) return new Map()
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true, positionSeconds: true, completedAt: true },
  })
  return new Map(
    rows.map((r) => [
      r.lessonId,
      { positionSeconds: r.positionSeconds, completed: !!r.completedAt },
    ]),
  )
}

/**
 * The lesson to resume at: the first lesson (in course/cohort order) the
 * user hasn't completed yet, or the last lesson if everything has been
 * completed. Falls back to the first lesson for signed-out visitors.
 */
export function resolveResumeLesson<T extends { id: string }>(
  orderedLessons: T[],
  completedLessonIds: Set<string>,
): T | undefined {
  if (orderedLessons.length === 0) return undefined
  const firstIncomplete = orderedLessons.find((l) => !completedLessonIds.has(l.id))
  return firstIncomplete ?? orderedLessons[orderedLessons.length - 1]
}
