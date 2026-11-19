import { BarChart3 } from "lucide-react"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import type { HackathonStats } from "@/botcamp/lib/hackathon-roster"

function pct(part: number, total: number): string | null {
  if (total === 0) return null
  return `${Math.round((part / total) * 100)}%`
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="rounded-bc-lg border border-border bg-card px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return "🥇 1st"
  if (rank === 2) return "🥈 2nd"
  if (rank === 3) return "🥉 3rd"
  return `${rank}th`
}

/**
 * Post-mortem numbers for a completed hackathon, meant to guide planning the
 * next one — funnel conversion, capacity used, review engagement. Only
 * `finalViewers` is hand-entered (no stream/analytics integration exists);
 * everything else is computed from this database.
 */
export function HackathonStatsPanel({ stats }: { stats: HackathonStats }) {
  return (
    <div className="space-y-bc-4">
      <div className="flex items-center gap-3 rounded-bc-lg border border-border bg-card px-4 py-3">
        <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Hackathon Stats</p>
          <p className="text-sm text-muted-foreground">
            Use these numbers as a guide when planning the next hackathon.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Registrants" value={String(stats.registrantsCount)} />
        <StatTile
          label="Strategies Created"
          value={String(stats.strategiesCreatedCount)}
          hint={pct(stats.strategiesCreatedCount, stats.registrantsCount) ? `${pct(stats.strategiesCreatedCount, stats.registrantsCount)} of registrants` : null}
        />
        <StatTile
          label="Applications Submitted"
          value={String(stats.applicationsSubmittedCount)}
          hint={pct(stats.applicationsSubmittedCount, stats.registrantsCount) ? `${pct(stats.applicationsSubmittedCount, stats.registrantsCount)} of registrants` : null}
        />
        <StatTile
          label="Ranked a Team"
          value={String(stats.rankedTeamsCount)}
          hint={pct(stats.rankedTeamsCount, stats.applicationsSubmittedCount) ? `${pct(stats.rankedTeamsCount, stats.applicationsSubmittedCount)} of submitted` : null}
        />
        <StatTile label="Certified Strategies" value={String(stats.certifiedStrategiesCount)} />
        <StatTile
          label="Avg Admin Score"
          value={stats.avgAdminScore != null ? `${stats.avgAdminScore}/10` : "—"}
          hint={
            stats.scoredApplicationsCount > 0
              ? `${stats.scoredApplicationsCount} scored · ${stats.distinctScoringAdmins} admin${stats.distinctScoringAdmins === 1 ? "" : "s"}`
              : "Not scored"
          }
        />
        <StatTile label="Duration" value={`${stats.durationDays}d`} />
        <StatTile
          label="Final Viewers"
          value={stats.finalViewers != null ? String(stats.finalViewers) : "—"}
          hint={stats.finalViewers == null ? "Add from the Edit form" : "Hand-entered"}
        />
      </div>

      {stats.winners.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Results
            </p>
            <ul className="space-y-bc-2">
              {stats.winners.map((winner) => (
                <li key={winner.applicationId} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 font-medium">{getRankDisplay(winner.rank)}</span>
                  <span className="flex-1 truncate">
                    {winner.userName}
                    {winner.strategyTitle && (
                      <span className="text-muted-foreground"> — {winner.strategyTitle}</span>
                    )}
                  </span>
                  {(winner.prizeAmount || winner.prizeNote) && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {[winner.prizeAmount, winner.prizeNote].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
