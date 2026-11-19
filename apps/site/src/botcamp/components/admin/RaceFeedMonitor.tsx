"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Copy, KeyRound, Radio, XCircle } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/botcamp/components/ui/table"
import { alertColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"

export interface FeedAgentRow {
  agentId: string
  strategyTitle: string
  team: string
  driver: string
  reading: { timestamp: string; pnlQuote: number; volumeQuote: number; stale: boolean } | null
}

export interface FeedStatus {
  tokenConfigured: boolean
  tokenCreatedAt: string | null
  endpointPath: string
  lastReceipt: { receivedAt: string; timestamp: string; accepted: number; unknownIds: string[] } | null
  // Agent ids the routine sent in the last 24h that aren't selected agents.
  unknownIds: string[]
  staleAfterMinutes: number
}

const REFRESH_MS = 30_000

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const signedUsd = (v: number) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`

function ago(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`
}

/**
 * Admin view of the race feed: whether the Condor routine is posting, what
 * it last sent per agent, and any agent ids it sent that the site doesn't
 * know. Re-renders from the server every 30s.
 */
export function RaceFeedMonitor({
  hackathonId,
  feed,
  agents,
}: {
  hackathonId: string
  feed: FeedStatus
  agents: FeedAgentRow[]
}) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS)
    return () => clearInterval(id)
  }, [router])

  const reporting = agents.filter((a) => a.reading && !a.reading.stale).length

  return (
    <div className="space-y-bc-6">
      <FeedBanner feed={feed} reporting={reporting} total={agents.length} />
      <TokenPanel hackathonId={hackathonId} feed={feed} />

      <Card>
        <CardHeader>
          <CardTitle>
            Selected Agents ({reporting}/{agents.length} reporting)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="font-mono">agent_id</span> is what the routine sends for each agent: its strategy slug.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>agent_id</TableHead>
                <TableHead>Team / Driver</TableHead>
                <TableHead className="text-right">P&amp;L</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead>Last reading</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent, i) => (
                <TableRow key={agent.agentId}>
                  <TableCell className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">{agent.agentId}</div>
                    <div className="text-xs text-muted-foreground">{agent.strategyTitle}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{agent.team}</div>
                    <div className="text-xs text-muted-foreground">{agent.driver}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {agent.reading ? signedUsd(agent.reading.pnlQuote) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {agent.reading ? usd.format(agent.reading.volumeQuote) : "—"}
                  </TableCell>
                  <TableCell>
                    <ReadingStatus reading={agent.reading} staleAfterMinutes={feed.staleAfterMinutes} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {feed.unknownIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unknown agent ids (last 24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-bc-3">
            <p className="text-sm text-muted-foreground">
              The routine sent these, but they aren&apos;t a selected agent&apos;s strategy slug, so their readings
              were dropped. Usually a typo, or a strategy that was renamed before it was selected.
            </p>
            <ul className="flex flex-wrap gap-2">
              {feed.unknownIds.map((id) => (
                <li key={id} className="rounded-bc-md border border-border px-2 py-1 font-mono text-xs">
                  {id}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Generate, replace or revoke the hackathon's feed token. A new token is shown
 * once — only its digest is stored — so it has to be copied right away.
 */
function TokenPanel({ hackathonId, feed }: { hackathonId: string; feed: FeedStatus }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const endpoint = `/api/admin/hackathons/${hackathonId}/race-feed-token`

  async function generate() {
    if (
      feed.tokenConfigured &&
      !confirm("Generate a new token? The current one stops working immediately, so the Condor routine will need the new one.")
    ) {
      return
    }
    setBusy(true)
    const res = await fetch(endpoint, { method: "POST" })
    setBusy(false)
    if (!res.ok) return toast.error("Couldn't generate a token")
    setToken((await res.json()).data.token)
    router.refresh()
  }

  async function revoke() {
    if (!confirm("Revoke the token? The feed stops accepting readings until a new token is generated.")) return
    setBusy(true)
    const res = await fetch(endpoint, { method: "DELETE" })
    setBusy(false)
    if (!res.ok) return toast.error("Couldn't revoke the token")
    setToken(null)
    toast.success("Token revoked")
    router.refresh()
  }

  async function copy() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      toast.success("Token copied")
    } catch {
      toast.error("Couldn't copy — select it and copy by hand")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Feed Token
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        <p className="text-sm text-muted-foreground">
          The Condor routine sends it as <span className="font-mono">Authorization: Bearer &lt;token&gt;</span>. It
          only lets someone write race readings for this hackathon. Share it privately (a DM or a password manager),
          never in an issue or in code.
        </p>

        {token && (
          <div className={cn("space-y-bc-2 rounded-bc-lg p-4 text-sm", alertColors.warning)}>
            <p className="font-semibold">Copy this token now — it won&apos;t be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all break-all rounded bg-background/60 px-2 py-1.5 font-mono text-xs text-foreground">
                {token}
              </code>
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="mr-1.5 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generate} disabled={busy}>
            {feed.tokenConfigured ? "Regenerate token" : "Generate feed token"}
          </Button>
          {feed.tokenConfigured && (
            <Button variant="outline" onClick={revoke} disabled={busy}>
              Revoke
            </Button>
          )}
          {/* Server and browser may format the date in different time zones. */}
          <span className="text-xs text-muted-foreground" suppressHydrationWarning>
            {feed.tokenConfigured && feed.tokenCreatedAt
              ? `Active · generated ${new Date(feed.tokenCreatedAt).toLocaleString()}`
              : "No token — the feed is off"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function FeedBanner({ feed, reporting, total }: { feed: FeedStatus; reporting: number; total: number }) {
  if (!feed.tokenConfigured) {
    return (
      <div className={cn("flex gap-3 rounded-bc-lg p-4 text-sm", alertColors.warning)}>
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">The race feed is off</p>
          <p className="opacity-90">
            No feed token has been generated for this hackathon, so{" "}
            <span className="font-mono">{feed.endpointPath}</span> answers 404 and no readings can arrive. Generate
            one below and share it with whoever runs the Condor routine.
          </p>
        </div>
      </div>
    )
  }
  const last = feed.lastReceipt
  // eslint-disable-next-line react-hooks/purity -- as in Botcamp (its ESLint predates this rule)
  const live = last && Date.now() - Date.parse(last.receivedAt) <= feed.staleAfterMinutes * 60_000
  return (
    <div className={cn("flex gap-3 rounded-bc-lg p-4 text-sm", live ? alertColors.success : alertColors.info)}>
      {live ? <Radio className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
      <div className="space-y-bc-1">
        {/* Relative times differ by a few seconds between server and client. */}
        <p className="font-semibold" suppressHydrationWarning>
          {last
            ? `Last reading received ${ago(last.receivedAt)} · ${last.accepted} agent${last.accepted === 1 ? "" : "s"}` +
              (last.unknownIds.length ? ` · ${last.unknownIds.length} unknown` : "")
            : "No reading received yet"}
        </p>
        <p className="opacity-90">
          {reporting}/{total} agents reporting. The routine posts to{" "}
          <span className="font-mono">POST {feed.endpointPath}</span> with the race feed token; the same path with GET
          lists the agent ids. Refreshes every 30s.
        </p>
      </div>
    </div>
  )
}

function ReadingStatus({
  reading,
  staleAfterMinutes,
}: {
  reading: FeedAgentRow["reading"]
  staleAfterMinutes: number
}) {
  if (!reading) return <span className="text-xs text-muted-foreground">No data</span>
  if (reading.stale) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning" suppressHydrationWarning>
        <AlertTriangle className="h-3.5 w-3.5" />
        Stale · {ago(reading.timestamp)} (over {staleAfterMinutes}m)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success" suppressHydrationWarning>
      <CheckCircle2 className="h-3.5 w-3.5" />
      Reporting · {ago(reading.timestamp)}
    </span>
  )
}
