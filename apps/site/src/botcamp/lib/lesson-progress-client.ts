/** Fraction of a video that must be watched before a lesson counts as complete. */
export const COMPLETION_THRESHOLD = 0.9

/**
 * Reports playback progress for a lesson. Best-effort — a dropped request
 * just means the next resume point is slightly stale, not worth surfacing
 * to the viewer. `keepalive` lets the request survive a client-side route
 * change fired from the same tick (e.g. clicking "Up next").
 */
export async function reportLessonProgress(
  lessonId: string,
  positionSeconds: number,
  completed: boolean,
) {
  try {
    await fetch(`/api/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionSeconds, completed }),
      keepalive: true,
    })
  } catch {
    // ignore — see above
  }
}
