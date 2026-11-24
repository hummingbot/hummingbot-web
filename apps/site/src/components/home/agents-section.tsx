import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { urls } from "@/config/site";
import {
  FEATURED_HACKATHON,
  getRaceStandings,
  type RaceStandings as Standings,
} from "@/lib/hackathon";
import { getHubAgents, type HubAgent } from "@/lib/hub";
import { CondorHubMock } from "./condor-hub-mock";
import { RaceStandings } from "./race-standings";

/**
 * Strategies: what the community built and raced. The final standings of
 * Botcamp's Agent Builders Cup (each row clones that agent) in front of
 * Condor's Agent Hub, and the way to the library and the hackathons.
 */
export async function AgentsSection() {
  const [agents, standings] = await Promise.all([
    getHubAgents().catch((): HubAgent[] => []),
    getRaceStandings().catch((): Standings | null => null),
  ]);
  const catalogue = new Map(agents.map((a) => [a.slug, a]));

  return (
    <section id="agents" className="relative w-full scroll-mt-16 overflow-hidden border-b border-border py-20 md:py-28 lg:min-h-[44rem]">
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 md:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 lg:pt-10">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Strategies
          </p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
            Run strategies that raced live.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Market making strategies and AI agents from the community, raced with real capital in Botcamp&apos;s
            hackathons, like the {FEATURED_HACKATHON.title}. Clone one into Condor and run it on your own keys.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={urls.hub}
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Browse strategies <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
            <Link
              href={urls.hackathons}
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-6 text-base font-medium transition-colors hover:bg-muted"
            >
              See hackathons
            </Link>
          </div>
        </div>

        {standings && standings.entries.length > 0 && (
          // The Hub sits behind the standings, receding and bleeding off the
          // right edge. It's absolutely placed so it never sizes the column;
          // the section clips what overflows.
          <div className="relative min-w-0">
            {agents.length > 0 && (
              <Link
                href={urls.hub}
                className="group/hub absolute left-6 top-0 hidden w-[56rem] rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:block"
              >
                <CondorHubMock
                  agents={agents.slice(0, 9)}
                  className="opacity-80 transition-[opacity,border-color] duration-300 group-hover/hub:border-primary/40 group-hover/hub:opacity-95"
                />
                <span className="absolute right-72 top-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background/90 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider opacity-0 transition-opacity duration-300 group-hover/hub:opacity-100 group-focus-visible/hub:opacity-100">
                  Open the Hub <ArrowUpRight className="size-3" aria-hidden="true" />
                </span>
              </Link>
            )}
            <div className="relative z-10 mx-auto max-w-md lg:mx-0 lg:ml-2 lg:mt-48 lg:w-[27rem] lg:max-w-none">
              <RaceStandings standings={standings} catalogue={catalogue} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
