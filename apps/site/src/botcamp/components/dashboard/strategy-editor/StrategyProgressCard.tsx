"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Check } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"

interface StrategyProgressCardProps {
  title: string
  summary: string
  details: string
  videoURL: string
  filesCount: number
  /**
   * An agent's page: it's done when its package passes review, so details,
   * video and code files are optional and the package's steps count instead.
   */
  agent?: { hasVersion: boolean; approved: boolean }
}

export function StrategyProgressCard({
  title,
  summary,
  details,
  videoURL,
  filesCount,
  agent,
}: StrategyProgressCardProps) {
  const requirements = agent
    ? [
        { label: "Name", done: !!title.trim() },
        { label: "Summary", done: !!summary },
        { label: "Agent package uploaded", done: agent.hasVersion },
        { label: "Approved for Condor", done: agent.approved },
      ]
    : [
        { label: "Name", done: !!title.trim() },
        { label: "Summary", done: !!summary },
        { label: "Details", done: !!details },
        { label: "Video", done: !!videoURL },
        { label: "Code", done: filesCount > 0 },
      ]

  const completed = requirements.filter((r) => r.done).length
  const percent = Math.round((completed / requirements.length) * 100)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{agent ? "Agent Progress" : "Strategy Progress"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {/* Progress Bar */}
        <div className="space-y-bc-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">
              {completed}/{requirements.length}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                percent === 100 ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Requirements List */}
        <div className="space-y-bc-2">
          {requirements.map((req) => (
            <div key={req.label} className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center",
                  req.done ? "bg-success" : "bg-muted"
                )}
              >
                {req.done && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className={req.done ? "text-muted-foreground" : ""}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
