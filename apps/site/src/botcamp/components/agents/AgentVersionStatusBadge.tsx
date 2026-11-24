import { Badge } from "@/botcamp/components/ui/badge"
import { agentVersionStatusColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"

// Shared by the admin agent queue and the author's agent package card.
export function AgentVersionStatusBadge({ status }: { status: string }): React.JSX.Element {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", agentVersionStatusColors[status])}>
      {status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  )
}
