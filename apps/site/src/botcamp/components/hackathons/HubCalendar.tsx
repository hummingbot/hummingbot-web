import { PlayCircle } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { sessionDayEnd } from "@/botcamp/lib/hackathon-sessions"

export interface HubSession {
  id: string
  title: string
  description: string | null
  date: string | null
  /** Resolved stream/recording link, when the session has one. */
  videoUrl?: string | null
}

function formatLong(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * Full hackathon schedule as a vertical timeline — every session, sorted by
 * date. Past sessions are dimmed, the next upcoming one is tagged "Next up",
 * and any session with a link gets a "Watch" action.
 */
export function HubCalendar({ sessions }: { sessions: HubSession[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No sessions scheduled yet.</p>
  }

  // eslint-disable-next-line react-hooks/purity -- as in Botcamp (its ESLint predates this rule)
  const now = Date.now()
  // Date-only sessions stay "upcoming" through the end of their calendar day.
  const nextUpIndex = sessions.findIndex(
    (s) => s.date && sessionDayEnd(s.date) > now,
  )

  return (
    <ol className="relative ml-1 border-l border-border">
      {sessions.map((s, i) => {
        const isNext = i === nextUpIndex
        const isPast = s.date ? sessionDayEnd(s.date) <= now : false
        return (
          <li key={s.id} className={cn("relative pl-6", i === sessions.length - 1 ? "pb-0" : "pb-6")}>
            <span
              className={cn(
                "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border",
                isNext
                  ? "border-primary bg-primary"
                  : isPast
                    ? "border-border bg-border"
                    : "border-border bg-muted",
              )}
            />
            <div className="flex flex-wrap items-center gap-2">
              {s.date && (
                <p
                  className={cn(
                    "font-mono text-[11px] uppercase tracking-wider",
                    isPast ? "text-muted-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {formatLong(s.date)}
                </p>
              )}
              {isNext && (
                <span className="rounded-bc-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-primary">
                  Next up
                </span>
              )}
            </div>
            <p
              className={cn(
                "mt-0.5 font-semibold leading-tight",
                isPast ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {s.title}
            </p>
            {s.description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            )}
            {s.videoUrl && (
              <a
                href={s.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <PlayCircle className="h-4 w-4" />
                Watch session
              </a>
            )}
          </li>
        )
      })}
    </ol>
  )
}
