"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { HackathonStatCard } from "@/botcamp/components/admin/HackathonStatCard"
import { useRegistrantFunnel } from "@/botcamp/components/admin/RegistrantFunnelContext"

export interface FunnelStage {
  label: string
  count: number
  names: string[]
}

function StageRow({ stage, total }: { stage: FunnelStage; total: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0

  return (
    <div className="space-y-bc-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={stage.names.length === 0}
        className="flex w-full items-center justify-between gap-2 text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {stage.names.length > 0 &&
            (expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ))}
          {stage.label}
        </span>
        <span className="text-sm text-muted-foreground">
          {stage.count} / {total} ({pct}%)
        </span>
      </button>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      {expanded && stage.names.length > 0 && (
        <p className="pl-5 text-xs text-muted-foreground">{stage.names.join(", ")}</p>
      )}
    </div>
  )
}

/** The clickable "Registrants" stat card — lives inside the stats grid. */
export function RegistrantsStatTrigger({ registrantsCount }: { registrantsCount: number }) {
  const funnel = useRegistrantFunnel()
  return (
    <HackathonStatCard
      label="Registrants"
      value={String(registrantsCount)}
      interactive
      onClick={funnel?.toggle}
    />
  )
}

/** The funnel breakdown — renders inline (not a modal) right below the stats grid, toggled by the trigger above. */
export function RegistrantFunnelPanel({
  registrantsCount,
  stages,
}: {
  registrantsCount: number
  stages: FunnelStage[]
}) {
  const funnel = useRegistrantFunnel()
  if (!funnel?.open) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-bc-0">
        <CardTitle className="text-base">Registrant Funnel</CardTitle>
        <button
          type="button"
          onClick={funnel.toggle}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {stages.map((stage) => (
          <StageRow key={stage.label} stage={stage} total={registrantsCount} />
        ))}
      </CardContent>
    </Card>
  )
}
