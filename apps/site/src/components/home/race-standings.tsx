import Link from "next/link";
import { ArrowRight, ArrowUpRight, Trophy } from "lucide-react";
import { cn } from "@hummingbot/ui";
import { urls } from "@/config/site";
import { CloneToCondor } from "@/components/hub/clone-to-condor";
import {
  FEATURED_HACKATHON,
  formatCompactUsd,
  type RaceStandings as Standings,
} from "@/lib/hackathon";
import { condorConnectUrl, type HubAgent } from "@/lib/hub";

const kicker = "font-mono text-[10px] font-bold uppercase tracking-[0.18em]";

function Pnl({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        value > 0
          ? "text-bull"
          : value < 0
            ? "text-bear"
            : "text-muted-foreground",
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

/**
 * Final standings of Botcamp's Agent Builders Cup, compact: the agents that
 * raced live with real capital, each clonable when it's in the Hub catalogue.
 */
export function RaceStandings({
  standings,
  catalogue,
  rows = 5,
  linkToResults = true,
}: {
  standings: Standings;
  catalogue: Map<string, HubAgent>;
  rows?: number;
  /** Off on the results page itself. */
  linkToResults?: boolean;
}) {
  const top = standings.entries.slice(0, rows);
  const resultsHref = `${urls.hackathons}/${FEATURED_HACKATHON.slug}`;

  return (
    // The whole card opens the Cup's results, like the Hub behind it opens the
    // Hub: a stretched link underneath, the content above it ignoring the
    // pointer except its own links and Clone buttons.
    <div className="group/race relative overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-black/70 transition-colors hover:border-primary/70">
      <Link
        href={resultsHref}
        aria-label={`Open the ${FEATURED_HACKATHON.title} results`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {/* window bar: this site's own Botcamp section */}
      <div className="pointer-events-none relative z-[1] flex items-center gap-2.5 border-b border-border bg-background/60 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="size-2 rounded-full bg-muted-foreground/30" />
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          hummingbot.org/hackathons
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background/90 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary opacity-0 transition-opacity duration-300 group-hover/race:opacity-100 group-focus-within/race:opacity-100">
          View results <ArrowUpRight className="size-3" aria-hidden="true" />
        </span>
      </div>

      <div className="pointer-events-none relative z-[1] flex items-end justify-between gap-4 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p
            className={`${kicker} mb-1 flex items-center gap-1.5 text-primary`}
          >
            <Trophy className="size-3" aria-hidden="true" /> Final standings
          </p>
          <h2 className="truncate text-lg font-bold tracking-tight">
            <span className="inline-flex items-center gap-1.5">
              {FEATURED_HACKATHON.title}
              <ArrowUpRight
                className="size-4 -translate-x-1 opacity-0 transition-all group-hover/race:translate-x-0 group-hover/race:opacity-100"
                aria-hidden="true"
              />
            </span>
          </h2>
        </div>
        <dl className="flex shrink-0 gap-4 text-right">
          <div>
            <dt className="text-[10px] text-muted-foreground">Traded</dt>
            <dd className="font-mono text-xs font-semibold tabular-nums">
              {formatCompactUsd(standings.totalVolume)}
            </dd>
          </div>
          {standings.winningSquad && (
            <div>
              <dt className="text-[10px] text-muted-foreground">
                Winning squad
              </dt>
              <dd className="text-xs font-semibold text-primary">
                {standings.winningSquad}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <table className="pointer-events-none relative z-[1] w-full table-fixed text-left text-sm">
        <thead>
          <tr className="border-y border-border bg-background/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="w-11 py-1.5 pl-4 font-medium">
              #
            </th>
            <th scope="col" className="py-1.5 font-medium">
              Agent
            </th>
            <th
              scope="col"
              className="hidden w-20 py-1.5 font-medium sm:table-cell"
            >
              Squad
            </th>
            <th scope="col" className="w-16 py-1.5 text-right font-medium">
              PnL
            </th>
            <th
              scope="col"
              className="w-24 py-1.5 pl-2 pr-4 text-right font-medium"
            >
              <span className="sr-only">Clone</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {top.map((e) => {
            const agent = catalogue.get(e.slug);
            return (
              <tr
                key={e.slug}
                className={cn(
                  "border-b border-border/60 last:border-b-0",
                  e.rank === 1 && "bg-primary/5",
                )}
              >
                <td className="py-2 pl-4">
                  <span
                    className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      e.rank === 1 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {e.rank}
                  </span>
                </td>
                <td className="py-2 pr-2">
                  {agent ? (
                    <Link
                      href={`/hub/${e.slug}`}
                      title={e.title}
                      // -my/py: a 24px+ hit area without moving the row.
                      className="pointer-events-auto -my-1 flex min-w-0 items-center gap-1 py-1 text-[13px] font-semibold transition-colors hover:text-primary"
                    >
                      <span className="truncate">{e.shortTitle}</span>
                      <ArrowUpRight
                        className="size-3 shrink-0 opacity-0 transition-opacity group-hover/race:opacity-40"
                        aria-hidden="true"
                      />
                    </Link>
                  ) : (
                    <span className="block truncate text-[13px] font-semibold">
                      {e.shortTitle}
                    </span>
                  )}
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {e.driver}
                  </span>
                </td>
                <td className="hidden py-2 pr-2 sm:table-cell">
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {e.squad}
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-[11px] tabular-nums">
                  <Pnl value={e.pnlPercent} />
                </td>
                <td className="pointer-events-auto py-2 pl-2 pr-4 text-right">
                  {agent ? (
                    <CloneToCondor
                      slug={agent.slug}
                      version={agent.version}
                      name={agent.name}
                      connectUrl={condorConnectUrl}
                      size="sm"
                      label="Clone"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pointer-events-none relative z-[1] flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-[11px]">
        <span className="text-muted-foreground">
          {standings.entries.length} agents raced with real capital
        </span>
        {linkToResults && (
          <Link
            href={resultsHref}
            className="pointer-events-auto -my-1.5 inline-flex items-center gap-1 py-1.5 font-semibold text-primary hover:underline"
          >
            Full results <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
