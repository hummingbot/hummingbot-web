import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, BadgeCheck, Trophy } from "lucide-react";
import { cn } from "@hummingbot/ui";
import { urls } from "@/config/site";
import {
  FEATURED_HACKATHON,
  getRaceStandings,
  type RaceStandings,
} from "@/lib/hackathon";
import { getHubLibrary, type HubLibraryItem } from "@/lib/hub";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

/**
 * "Everything Hummingbot, in one place": a bento of the site's sections, each
 * card showing a live slice of what's behind it rather than an icon.
 */
export async function PathCards() {
  const [library, standings] = await Promise.all([
    getHubLibrary().catch((): HubLibraryItem[] => []),
    getRaceStandings().catch((): RaceStandings | null => null),
  ]);
  const podium = standings?.entries.slice(0, 3) ?? [];

  return (
    <section
      id="sections"
      className="w-full scroll-mt-16 border-b border-border py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 md:mb-14">
          <div className="max-w-2xl">
            <p className={`${kicker} mb-3 text-primary`}>
              One site, one account
            </p>
            <h2 className="text-balance text-4xl font-bold leading-[1.02] tracking-[-0.03em] md:text-6xl">
              Everything Hummingbot,{" "}
              <span className="text-muted-foreground">in one place.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
            Learn it in Botcamp, race it in a hackathon, share it on the Hub,
            and look anything up in the docs.
          </p>
        </div>

        <div className="grid auto-rows-[minmax(0,auto)] gap-4 lg:grid-cols-6">
          {/* Hub — the biggest tile: real agents, ready to clone */}
          <Tile
            href={urls.hub}
            index="01"
            title="Hub"
            body="Clone reviewed agents into Condor, or publish your own."
            className="lg:col-span-4 lg:row-span-2"
          >
            <ul className="mt-6 flex flex-col gap-2">
              {library.slice(0, 4).map((a) => (
                <li
                  key={a.slug}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 transition-colors group-hover:border-foreground/15"
                >
                  <span className="w-8 shrink-0 font-mono text-sm font-bold tabular-nums text-primary">
                    {a.showcase ? `#${a.showcase.rank}` : "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {a.name}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {a.slug}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 rounded-md border border-primary/40 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:inline-flex">
                    <BadgeCheck className="size-3" aria-hidden="true" /> Condor
                    Ready
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              {library.length} agents · Condor › Hub › Pull agents
            </p>
          </Tile>

          {/* Hackathons — the podium */}
          <Tile
            href={urls.hackathons}
            index="02"
            title="Hackathons"
            body={`Free team races with real capital. The ${FEATURED_HACKATHON.title} just finished.`}
            className="lg:col-span-2 lg:row-span-2"
          >
            {podium.length > 0 && (
              <div
                className="mt-auto flex items-end justify-center gap-2 pt-8"
                aria-label="Podium"
              >
                {[podium[1], podium[0], podium[2]].filter(Boolean).map((e) => (
                  <div
                    key={e.slug}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    {e.rank === 1 && (
                      <Trophy
                        className="size-5 text-primary"
                        aria-hidden="true"
                      />
                    )}
                    <span className="w-full truncate text-center text-xs font-semibold">
                      {e.shortTitle}
                    </span>
                    <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                      {e.squad}
                    </span>
                    <span
                      className={cn(
                        "flex w-full items-start justify-center rounded-t-lg border border-b-0 pt-2 font-mono text-lg font-bold",
                        e.rank === 1
                          ? "h-24 border-primary/50 bg-primary/15 text-primary"
                          : "h-16 border-border bg-muted/50 text-muted-foreground",
                      )}
                    >
                      {e.rank}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Tile>

          {/* Docs — a terminal and the main topics */}
          <Tile
            href={urls.docs}
            index="03"
            title="Docs"
            body="Install, write scripts and controllers, and connect to 50+ exchanges."
            className="lg:col-span-3"
          >
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-[#0f0f0f] font-mono text-xs">
              <div
                className="flex gap-1.5 border-b border-white/10 px-3 py-2"
                aria-hidden="true"
              >
                <span className="size-2 rounded-full bg-white/20" />
                <span className="size-2 rounded-full bg-white/20" />
                <span className="size-2 rounded-full bg-white/20" />
              </div>
              <p className="truncate px-4 py-3 text-white/80">
                <span className="text-white/40">$ </span>curl -fsSL
                hummingbot.org/install-condor.sh | bash
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Installation",
                "Scripts",
                "Controllers",
                "Executors",
                "Connectors",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </Tile>

          {/* Botcamp — the next cohort */}
          <Tile
            href={urls.botcamp}
            index="04"
            title="Botcamp"
            body="Live cohorts and self-paced courses from the team that builds Hummingbot."
            className="lg:col-span-3"
          >
            <div className="mt-6 flex items-center gap-6">
              <span
                className="font-monoton text-7xl leading-none text-primary"
                aria-hidden="true"
              >
                15
              </span>
              <span className="flex flex-col gap-2">
                <span className={`${kicker} text-muted-foreground`}>
                  Next cohort · [Start date]
                </span>
                <span className="flex flex-wrap gap-2">
                  {["Basic", "Intermediate", "Advanced"].map((l) => (
                    <span
                      key={l}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {l}
                    </span>
                  ))}
                </span>
              </span>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({
  href,
  index,
  title,
  body,
  className,
  children,
}: {
  href: string;
  index: string;
  title: string;
  body: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-[border-color,box-shadow] duration-300 hover:border-primary/40 hover:shadow-[0_24px_60px_-30px_hsl(var(--primary)/0.5)] md:p-8",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-muted-foreground">
            {index}
          </span>
          <h3 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowUpRight
            className="size-4 transition-transform group-hover:rotate-45"
            aria-hidden="true"
          />
        </span>
      </div>
      {children}
    </Link>
  );
}
