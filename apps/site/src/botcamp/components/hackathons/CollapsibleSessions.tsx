"use client"

import { useState } from "react"
import { Badge } from "@/botcamp/components/ui/badge"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { Calendar, ChevronDown, PlayCircle } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { sessionDayEnd } from "@/botcamp/lib/hackathon-sessions"

interface Session {
  id: string
  title: string
  description: string | null
  date: string | null
  videoUrl?: string | null
}

interface CollapsibleSessionsProps {
  sessions: Session[]
  /** Whether the schedule is open on first render. Defaults to false. */
  defaultOpen?: boolean
}

export function CollapsibleSessions({
  sessions,
  defaultOpen = false,
}: CollapsibleSessionsProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (sessions.length === 0) return null

  // eslint-disable-next-line react-hooks/purity -- as in Botcamp (its ESLint predates this rule)
  const now = Date.now()

  return (
    <div className="max-w-3xl mx-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="hackathon-sessions-list"
        className={cn(
          "w-full flex items-center justify-between gap-3 rounded-bc-xl border border-border bg-card/60 px-5 py-4 text-left",
          "transition-[transform,border-color,background-color] duration-150 ease-out",
          "hover:-translate-y-0.5 hover:border-border/80 hover:bg-card",
          "focus-visible:outline-hidden focus-visible:-translate-y-0.5 focus-visible:border-primary/60",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-bc-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base">Detailed Schedule</p>
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"} ·{" "}
              {open ? "Hide" : "Show"} dates
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div id="hackathon-sessions-list" className="relative mt-6">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent md:-translate-x-0.5" />

          {sessions.map((sessionItem, index) => {
            const isLeft = index % 2 === 0
            const isPast = sessionItem.date ? sessionDayEnd(sessionItem.date) <= now : false
            return (
              <div
                key={sessionItem.id}
                className={`relative flex items-start gap-4 md:gap-8 mb-8 last:mb-0 ${
                  isLeft ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Timeline dot */}
                <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-primary rounded-full -translate-x-1/2 mt-2 ring-4 ring-background" />

                {/* Content */}
                <div className={`ml-10 md:ml-0 md:w-1/2 ${isLeft ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <Card className="inline-block text-left w-full border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      {sessionItem.date && (
                        <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5">
                          <Calendar className="h-3 w-3 mr-1.5" />
                          {new Date(sessionItem.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </Badge>
                      )}
                      <h3 className="font-bold text-lg mb-2">{sessionItem.title}</h3>
                      {sessionItem.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {sessionItem.description}
                        </p>
                      )}
                      {sessionItem.videoUrl && (
                        <a
                          href={sessionItem.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <PlayCircle className="h-4 w-4" />
                          {isPast ? "Watch" : "Watch Live Stream"}
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
