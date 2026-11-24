"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

export type LessonProgressStatus = "in-progress" | "completed"

interface LessonProgressContextValue {
  overrides: Record<string, LessonProgressStatus>
  setLessonProgress: (lessonId: string, status: LessonProgressStatus) => void
}

const LessonProgressContext = createContext<LessonProgressContextValue | null>(null)

/**
 * Live lesson-progress overrides, scoped to one learn session (course or
 * cohort lesson tree) inside `LearnShell`. Seeded empty — the server-
 * rendered sidebar `groups` already carry each lesson's last-known
 * status; this only tracks updates made during the current visit (a
 * video starting or finishing) so the sidebar reflects them immediately,
 * without a page refresh.
 */
export function LessonProgressProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, LessonProgressStatus>>({})

  const setLessonProgress = useCallback((lessonId: string, status: LessonProgressStatus) => {
    setOverrides((prev) => {
      // Never downgrade a completed lesson back to in-progress (e.g. a
      // rewind-and-replay after finishing).
      if (prev[lessonId] === "completed" && status !== "completed") return prev
      if (prev[lessonId] === status) return prev
      return { ...prev, [lessonId]: status }
    })
  }, [])

  return (
    <LessonProgressContext.Provider value={{ overrides, setLessonProgress }}>
      {children}
    </LessonProgressContext.Provider>
  )
}

/** The live status for `lessonId` if it's changed during this visit, else undefined. */
export function useLessonProgressOverride(lessonId: string): LessonProgressStatus | undefined {
  const ctx = useContext(LessonProgressContext)
  return ctx?.overrides[lessonId]
}

/** Setter for live lesson-progress overrides. A no-op outside a `LessonProgressProvider`. */
export function useSetLessonProgress() {
  const ctx = useContext(LessonProgressContext)
  return ctx?.setLessonProgress ?? (() => {})
}
