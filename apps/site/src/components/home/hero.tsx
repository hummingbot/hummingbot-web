import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { urls } from "@/config/site";
import { MarketDepthBackground } from "@/components/ui/market-depth-background";
import { EXCHANGE_COUNT } from "@/lib/exchanges";
import {
  FEATURED_HACKATHON,
  formatCompactUsd,
  getRaceStandings,
  type RaceStandings as Standings,
} from "@/lib/hackathon";
import { getHubAgents, type HubAgent } from "@/lib/hub";
import { formatUsd, getVolumesData } from "@/lib/volumes";
import { CondorHubMock } from "./condor-hub-mock";
import { RaceStandings } from "./race-standings";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

/**
 * Home hero. Full-bleed over the market depth chart: a large headline about
 * cloning agents, the final standings of Botcamp's Agent Builders Cup (the
 * agents in the Hub raced there, and each can be cloned from its row) in front
 * of Condor's Agent Hub, and a strip of real numbers.
 */
export async function Hero() {
  const [agents, standings] = await Promise.all([
    getHubAgents().catch((): HubAgent[] => []),
    getRaceStandings().catch((): Standings | null => null),
  ]);
  const catalogue = new Map(agents.map((a) => [a.slug, a]));
  const { lastYear } = getVolumesData();

  const stats = [
    {
      value: agents.length ? String(agents.length) : "—",
      label: "Agents ready to clone",
    },
    {
      value: standings ? formatCompactUsd(standings.totalVolume) : "—",
      label: `Traded live in the ${FEATURED_HACKATHON.title}`,
    },
    { value: `${EXCHANGE_COUNT}+`, label: "Exchanges and DEXs" },
    {
      value: formatUsd(lastYear.totalVolume),
      label: "Hummingbot volume, last 12 months",
    },
  ];

  return (
    <>
      <section className="relative w-full overflow-hidden border-b border-border">
        <MarketDepthBackground seed={11} opacity={0.6} />
        {/* Keep the headline legible over the chart */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 bg-background/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-background lg:via-background/75 lg:to-background/10"
        />

        <div className="relative z-20 mx-auto max-w-7xl px-4 pb-16 pt-12 md:px-6 lg:pb-20 lg:pt-16">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="min-w-0 lg:pt-8">
              <p
                className={`${kicker} mb-6 inline-flex items-center gap-2.5 text-primary`}
              >
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full rounded-full bg-primary opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Raced in the Botcamp {FEATURED_HACKATHON.title}
              </p>
              <h1 className="text-balance text-5xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-6xl md:text-7xl xl:text-[5.25rem]">
                Clone a trading agent.{" "}
                <span className="brand-highlight text-primary">Run it on your own keys.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                These agents raced live with real capital in Botcamp&apos;s
                hackathon. Pull one into Condor by its slug and run it,
                self-hosted, on the exchanges you already use.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={urls.hub}
                  className="inline-flex h-14 items-center justify-center rounded-md bg-primary px-8 text-lg font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                  Browse Agents
                  <ArrowRight className="ml-2 size-5" aria-hidden="true" />
                </Link>
                <Link
                  href={urls.hackathons}
                  className="inline-flex h-14 items-center justify-center rounded-md border border-input bg-background/60 px-8 text-lg font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted"
                >
                  Join the Next Cup
                </Link>
              </div>
              <Link
                href="/get-started"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                New to Hummingbot? Install it and run your first bot
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            {standings && standings.entries.length > 0 && (
              // The Hub sits behind the standings, receding and bleeding off
              // the right edge. It's absolutely placed so it never sizes the
              // column; the section clips what overflows.
              <div className="relative min-w-0">
                {agents.length > 0 && (
                  // The Hub behind is a way in too: it brightens on hover
                  // and a quiet "Open the Hub" shows in its corner.
                  <Link
                    href={urls.hub}
                    aria-label="Open the Hub"
                    className="group/hub absolute left-6 top-0 hidden w-[56rem] rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:block"
                  >
                    <CondorHubMock
                      agents={agents.slice(0, 9)}
                      className="opacity-80 transition-[opacity,border-color] duration-300 group-hover/hub:border-primary/40 group-hover/hub:opacity-95"
                    />
                    <span className="absolute right-72 top-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background/90 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary opacity-0 transition-opacity duration-300 group-hover/hub:opacity-100 group-focus-visible/hub:opacity-100">
                      Open the Hub{" "}
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </span>
                  </Link>
                )}
                <div className="relative z-10 mx-auto max-w-md lg:mx-0 lg:ml-2 lg:mt-64 lg:w-[27rem] lg:max-w-none">
                  <RaceStandings standings={standings} catalogue={catalogue} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Real numbers, right under the fold */}
      <section className="w-full border-b border-border bg-card">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col-reverse justify-end gap-2 px-4 py-8 md:px-6 md:py-10 ${i % 2 === 1 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <dt className={`${kicker} text-muted-foreground`}>{s.label}</dt>
              <dd className="text-4xl font-bold tabular-nums tracking-tight text-foreground md:text-5xl">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
