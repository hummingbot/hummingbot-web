"use client"

import { Badge } from "@/botcamp/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/botcamp/components/ui/accordion"
import { Users, Mail } from "lucide-react"

interface BroadcastStats {
  delivered: number
  opened: number
  clicked: number
  bounced: number
}

interface Broadcast {
  id: string
  subject: string
  body: string
  audienceType: string
  cohortNumber: number | null
  hackathonSlug: string | null
  recipientCount: number
  sentAt: Date
  sentBy: {
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  stats?: BroadcastStats | null
}

interface BroadcastHistoryTableProps {
  broadcasts: Broadcast[]
  audienceLabels: Record<string, string>
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—"
  return `${Math.round((numerator / denominator) * 100)}%`
}

const GRID_COLS = "grid-cols-[1fr_110px_80px_90px_90px_130px_140px]"

export function BroadcastHistoryTable({ broadcasts, audienceLabels }: BroadcastHistoryTableProps) {
  if (broadcasts.length === 0) {
    return <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {/* Header row */}
      <div className={`grid ${GRID_COLS} gap-4 px-4 py-3 text-sm font-medium text-muted-foreground border-b`}>
        <div>Subject</div>
        <div>Audience</div>
        <div className="text-right">Recipients</div>
        <div className="text-right">Opened</div>
        <div className="text-right">Clicked</div>
        <div>Sent By</div>
        <div>Date</div>
      </div>

      {broadcasts.map((broadcast) => (
        <AccordionItem key={broadcast.id} value={broadcast.id} className="border-b">
          <AccordionTrigger className="hover:no-underline hover:bg-muted/50 px-4 py-3 [&>svg]:hidden">
            <div className={`grid ${GRID_COLS} gap-4 w-full text-left text-sm`}>
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">{broadcast.subject}</span>
              </div>
              <div>
                <Badge variant="outline">
                  {broadcast.audienceType === 'cohort' && broadcast.cohortNumber
                    ? `Cohort ${broadcast.cohortNumber}`
                    : broadcast.audienceType === 'hackathon' && broadcast.hackathonSlug
                    ? broadcast.hackathonSlug
                    : audienceLabels[broadcast.audienceType] || broadcast.audienceType}
                </Badge>
              </div>
              <div className="flex items-center justify-end gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                {broadcast.recipientCount}
              </div>
              <div className="text-right text-muted-foreground">
                {broadcast.stats
                  ? `${broadcast.stats.opened} (${pct(broadcast.stats.opened, broadcast.stats.delivered)})`
                  : "—"}
              </div>
              <div className="text-right text-muted-foreground">
                {broadcast.stats
                  ? `${broadcast.stats.clicked} (${pct(broadcast.stats.clicked, broadcast.stats.delivered)})`
                  : "—"}
              </div>
              <div className="text-muted-foreground truncate">
                {broadcast.sentBy
                  ? `${broadcast.sentBy.firstName || ''} ${broadcast.sentBy.lastName || ''}`.trim() || broadcast.sentBy.email
                  : 'Unknown'}
              </div>
              <div className="text-muted-foreground">
                {new Date(broadcast.sentAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {broadcast.stats && (
              <div className="text-xs text-muted-foreground mb-2">
                Delivered: {broadcast.stats.delivered} ({pct(broadcast.stats.delivered, broadcast.recipientCount)}) · Bounced: {broadcast.stats.bounced}
              </div>
            )}
            <div className="bg-muted/30 rounded-bc-lg p-4 mt-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Email Body
              </div>
              <div className="text-sm whitespace-pre-wrap font-mono bg-background rounded p-3 border max-h-[400px] overflow-y-auto">
                {broadcast.body}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
