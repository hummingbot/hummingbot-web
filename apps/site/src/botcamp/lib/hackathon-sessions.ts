/**
 * Hackathon sessions store their stream/recording reference in
 * `HackathonSession.videoId` — either a full URL (e.g. a YouTube live link)
 * or a bare YouTube video ID. These helpers normalize that into a usable
 * link and find the next upcoming session.
 */

export function resolveSessionUrl(videoId: string | null | undefined): string | null {
  const v = videoId?.trim()
  if (!v) return null
  return v.startsWith("http") ? v : `https://www.youtube.com/watch?v=${v}`
}

/**
 * Session dates are stored date-only (UTC midnight), so a session counts as
 * upcoming through the END of its calendar day — otherwise an event happening
 * "today" (or tomorrow in western timezones, since UTC midnight arrives early)
 * would drop off Next Up prematurely.
 */
export function sessionDayEnd(date: string | Date): number {
  return new Date(date).getTime() + 24 * 60 * 60 * 1000
}

/** Next session whose day hasn't ended yet, else null. Assumes a date exists. */
export function nextSession<T extends { date: string | null }>(
  sessions: T[],
  now: Date,
): T | null {
  const upcoming = sessions
    .filter((s) => s.date && sessionDayEnd(s.date) > now.getTime())
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
  return upcoming[0] ?? null
}
