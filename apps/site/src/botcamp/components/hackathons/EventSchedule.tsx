import { type LucideIcon, PlayCircle, CalendarClock } from "lucide-react"
import { CollapsibleSessions } from "./CollapsibleSessions"
import { nextSession } from "@/botcamp/lib/hackathon-sessions"
import { cn } from "@/botcamp/lib/utils"
import { getContrastTextColor } from "@/botcamp/lib/color"

interface Session {
  id: string
  title: string
  description: string | null
  date: Date | string | null
  videoUrl?: string | null
}

interface Phase {
  id: string
  label: string
  icon: LucideIcon
  date: string | null
  desc: string
}

interface EventScheduleProps {
  sessions: Session[]
  phases?: Phase[]
  /** Index of the currently active phase (highlights done/current/upcoming). */
  currentPhase?: number
  /** Overrides the default orange brand accent with a sponsor's color (team
   * pages only) — the shared hackathon-wide page omits this and keeps the
   * default. */
  accentColor?: string
}

type PhaseState = "done" | "current" | "upcoming"

/** Phase circle look for a given state — Tailwind `primary` classes by
 * default, or inline styles derived from a sponsor's accentColor. */
function phaseCircleStyle(state: PhaseState, accentColor?: string) {
  if (!accentColor) {
    return {
      className: cn(
        state === "current"
          ? "bg-primary border-primary text-primary-foreground"
          : state === "done"
            ? "bg-primary/20 border-primary text-primary"
            : "bg-muted border-border text-muted-foreground",
      ),
    }
  }
  if (state === "upcoming") {
    return { className: "bg-muted border-border text-muted-foreground" }
  }
  return {
    className: "",
    style:
      state === "current"
        ? { backgroundColor: accentColor, borderColor: accentColor, color: getContrastTextColor(accentColor) }
        : {
            backgroundColor: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
            borderColor: accentColor,
            color: accentColor,
          },
  }
}

function phaseLabelStyle(state: PhaseState, accentColor?: string) {
  if (state !== "current") return {}
  return accentColor ? { style: { color: accentColor } } : { className: "text-primary" }
}

export function EventSchedule({ sessions, phases, currentPhase = 0, accentColor }: EventScheduleProps) {
  if (sessions.length === 0 && (!phases || phases.length === 0)) {
    return null
  }

  const now = new Date()
  const upcoming = nextSession(
    sessions.map((s) => ({
      ...s,
      date: s.date instanceof Date ? s.date.toISOString() : s.date,
    })),
    now,
  )
  const fmtNext = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })

  return (
    <section className="w-full py-16 md:py-24 bg-muted/50 dark:bg-muted/20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl text-foreground mb-4">
            Key Dates
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From agent build to winner&apos;s podium.
          </p>
        </div>

        {phases && phases.length > 0 && (
          <div className="max-w-5xl mx-auto mb-12">
            {/* Desktop: horizontal */}
            <div className="hidden md:block">
              <div className="relative flex justify-between items-start gap-2">
                <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-border" />
                {phases.map((p, i) => {
                  const state: PhaseState = i < currentPhase ? "done" : i === currentPhase ? "current" : "upcoming"
                  const Icon = p.icon
                  const circle = phaseCircleStyle(state, accentColor)
                  const label = phaseLabelStyle(state, accentColor)
                  return (
                    <div
                      key={p.id}
                      className="relative z-10 flex flex-col items-center text-center flex-1 min-w-0"
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full border-2 flex items-center justify-center",
                          circle.className,
                        )}
                        style={circle.style}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className={cn("mt-4 font-semibold", label.className ?? "text-foreground")} style={label.style}>
                        {p.label}
                      </p>
                      {p.date && (
                        <p className="font-mono text-xs text-muted-foreground mt-1">{p.date}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">{p.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile: vertical */}
            <div className="md:hidden relative pl-8">
              <div className="absolute left-3 top-1 bottom-1 w-0.5 bg-border" />
              {phases.map((p, i, arr) => {
                const state: PhaseState = i < currentPhase ? "done" : i === currentPhase ? "current" : "upcoming"
                const Icon = p.icon
                const isLast = i === arr.length - 1
                const circle = phaseCircleStyle(state, accentColor)
                const label = phaseLabelStyle(state, accentColor)
                return (
                  <div key={p.id} className={cn("relative flex items-start gap-4", !isLast && "pb-8")}>
                    <div
                      className={cn(
                        "absolute -left-[1.875rem] w-7 h-7 rounded-full border-2 flex items-center justify-center",
                        circle.className,
                      )}
                      style={circle.style}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="ml-2">
                      <p className={cn("font-semibold", label.className ?? "text-foreground")} style={label.style}>
                        {p.label}
                      </p>
                      {p.date && (
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">{p.date}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {upcoming && upcoming.date && (
          <div className="max-w-3xl mx-auto mb-6">
            <div
              className={cn(
                "flex items-center justify-between gap-4 rounded-bc-xl border bg-gradient-to-br via-card to-background p-5",
                !accentColor && "border-primary/30 from-primary/10",
              )}
              style={
                accentColor
                  ? {
                      borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)`,
                      backgroundImage: `linear-gradient(to bottom right, color-mix(in srgb, ${accentColor} 10%, transparent), hsl(var(--card)), hsl(var(--background)))`,
                    }
                  : undefined
              }
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    "mb-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
                    !accentColor && "text-primary",
                  )}
                  style={accentColor ? { color: accentColor } : undefined}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next up · {fmtNext(upcoming.date as string)}
                </p>
                <h3 className="text-lg font-bold leading-tight">{upcoming.title}</h3>
                {upcoming.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {upcoming.description}
                  </p>
                )}
              </div>
              {upcoming.videoUrl && (
                <a
                  href={upcoming.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-bc-md px-3 py-2 text-sm font-medium transition-colors",
                    accentColor ? "hover:opacity-90" : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                  style={
                    accentColor
                      ? { backgroundColor: accentColor, color: getContrastTextColor(accentColor) }
                      : undefined
                  }
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch
                </a>
              )}
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <CollapsibleSessions
            sessions={sessions.map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              date: s.date instanceof Date ? s.date.toISOString() : s.date,
              videoUrl: s.videoUrl,
            }))}
          />
        )}
      </div>
    </section>
  )
}
