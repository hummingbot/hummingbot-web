import Link from "next/link";
import { ArrowRight, Github, Star } from "lucide-react";
import { urls } from "@/config/site";
import { MarketDepthBackground } from "@/components/ui/market-depth-background";
import { EXCHANGE_COUNT } from "@/lib/exchanges";
import { formatStars, getRepoStars } from "@/lib/github";
import { formatUsd, getVolumesData } from "@/lib/volumes";
import { InstallTabs } from "./install-tabs";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";
const fmtCount = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);

/**
 * Home hero: Hummingbot is the open source framework for market makers, and
 * installing it is one command (Condor or the Hummingbot client, side by
 * side), with one row of Hummingbot's own numbers under it.
 */
export async function Hero() {
  const stars = await getRepoStars("hummingbot").catch(() => null);
  const { lastYear, windowEnd } = getVolumesData();
  const windowEndLabel = new Date(`${windowEnd}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const stats = [
    { value: formatUsd(lastYear.totalVolume), label: "Traded through Hummingbot in a year" },
    { value: fmtCount(lastYear.uniqueInstances), label: "Bots run in a year" },
    { value: `${EXCHANGE_COUNT}+`, label: "Exchanges and DEXs" },
    { value: stars ? formatStars(stars) : "—", label: "GitHub stars" },
  ];

  return (
    <>
      <section className="relative w-full overflow-hidden border-b border-border">
        <MarketDepthBackground seed={11} opacity={0.5} />
        {/* Keep the headline legible over the chart */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 bg-background/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-background lg:via-background/80 lg:to-background/20"
        />

        <div className="relative z-20 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 md:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <div className="min-w-0">
            <p className={`${kicker} mb-6 text-muted-foreground`}>Open source · Apache 2.0</p>
            <h1 className="text-balance text-5xl font-bold leading-[1.06] tracking-[-0.04em] sm:text-6xl xl:text-7xl">
              The open source framework for{" "}
              <span className="brand-highlight text-primary">market makers.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Market making strategies, connectors to {EXCHANGE_COUNT}+ exchanges, and AI agents that run them, on
              your own keys. Install it with one command.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/get-started"
                className="inline-flex h-14 items-center justify-center rounded-md bg-primary px-8 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get started
                <ArrowRight className="ml-2 size-5" aria-hidden="true" />
              </Link>
              <a
                href={urls.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-md border border-input bg-background/60 px-6 text-lg font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted"
              >
                <Github className="size-5" aria-hidden="true" />
                GitHub
                {stars && (
                  <span className="inline-flex items-center gap-1 border-l border-border pl-2 text-base tabular-nums text-muted-foreground">
                    <Star className="size-4 fill-current" aria-hidden="true" />
                    {formatStars(stars)}
                  </span>
                )}
              </a>
            </div>
          </div>

          <div className="min-w-0">
            <InstallTabs
              tabs={[
                {
                  id: "condor",
                  label: "Condor",
                  command: "curl -fsSL https://hummingbot.org/install-condor.sh | bash",
                  comment: "# Telegram + AI trading agents (Condor + API, Docker).",
                  icon: "phone",
                  title: "Start here to run strategies and agents",
                  description: "Condor runs the Hummingbot API and your bots, and you manage them from Telegram.",
                },
                {
                  id: "hummingbot",
                  label: "Hummingbot",
                  command:
                    "git clone https://github.com/hummingbot/hummingbot.git && cd hummingbot && make setup && make deploy",
                  comment: "# Hummingbot Client in Docker. Then: make link-cli",
                  icon: "code",
                  title: "Start here to code your own",
                  description: "The trading client in your terminal: strategy frameworks and every connector.",
                },
              ]}
            />
            <Link
              href="/get-started"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            >
              Full guide: install, connect your exchange, first bot <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Hummingbot's numbers, right under the fold */}
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
        <p className="mx-auto max-w-7xl px-4 pb-4 text-right text-xs text-muted-foreground md:px-6">
          Reported by Hummingbot instances, 12 months to {windowEndLabel}.{" "}
          <Link href="/volumes" className="underline decoration-primary underline-offset-4 hover:text-foreground">
            See the data
          </Link>
        </p>
      </section>
    </>
  );
}
