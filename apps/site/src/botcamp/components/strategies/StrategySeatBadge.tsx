import { Trophy } from "lucide-react"
import { Badge } from "@/botcamp/components/ui/badge"
import { cn } from "@/botcamp/lib/utils"

interface StrategySeatBadgeProps {
  teamName: string
  className?: string
}

/** Marks a strategy that holds a squad seat in a running hackathon. */
export function StrategySeatBadge({ teamName, className }: StrategySeatBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 border-primary/40 bg-primary/10 text-xs text-primary", className)}
    >
      <Trophy className="h-3 w-3" />
      Selected · {teamName}
    </Badge>
  )
}
