import Link from "next/link";
import { ArrowRight, ArrowUpRight, Github, Star } from "lucide-react";
import { githubOrg, urls } from "@/config/site";
import { formatStars, getOrgRepos } from "@/lib/github";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

// The figures hummingbot.org's home reports, from reporting.hummingbot.org.
const STATS = [
  { value: "$47B+", label: "Total trade volume" },
  { value: "111K+", label: "Hummingbot instances" },
  { value: "318", label: "Connectors" },
] as const;

// The stack top-down, as the docs draw it: Condor drives the API, which runs
// the client and Gateway.
const LAYERS = [
  {
    layer: "AI harness",
    intent: "Run a ready-made agent",
    name: "Condor",
    repo: "condor",
    docs: "condor",
    body: "Build and run agentic strategies and bot instances, and talk to them on Telegram.",
  },
  {
    layer: "Server",
    intent: "Run many bots from one place",
    name: "Hummingbot API",
    repo: "hummingbot-api",
    docs: "hummingbot-api",
    body: "One server to execute trades, fetch market data, and deploy Hummingbot instances.",
  },
  {
    layer: "Core",
    intent: "Code your own strategy",
    name: "Hummingbot Client",
    repo: "hummingbot",
    docs: "client",
    body: "The trading engine: connectors to the exchanges you trade on and the strategy frameworks.",
  },
  {
    layer: "Core",
    intent: "Trade on DEXs",
    name: "Gateway",
    repo: "gateway",
    docs: "gateway",
    body: "Middleware that connects Hummingbot to DEXs and lands transactions on-chain.",
  },
] as const;

// Names people still find in search results and old tutorials, and where they went.
const LEGACY = [
  { name: "Dashboard", status: "Deprecated", now: "Condor", href: `${urls.docs}/condor` },
  { name: "V1 strategies", status: "Legacy", now: "V2 controllers", href: `${urls.docs}/client` },
] as const;

/**
 * "Which one do you need?" on the home: the open source stack read as tasks
 * (what you want to do → which piece), what it has run, and the names that
 * are gone. Users' top confusion is which product they need.
 */
export async function HummingbotStackSection() {
  const repos = await getOrgRepos();

  return (
    <section id="products" className="w-full scroll-mt-16 border-b border-border py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <div>
            <p className={`${kicker} mb-3 text-primary`}>Products · Open Source</p>
            <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
              Which one do you need?
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Four open source pieces, one stack: Condor drives the API, which runs the client and Gateway. Start
              from what you want to do. Everything is Apache 2.0 and maintained by the Hummingbot Foundation.
            </p>
          </div>
          <a
            href="https://reporting.hummingbot.org"
            target="_blank"
            rel="noreferrer"
            className="group grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border"
          >
            {STATS.map(({ value, label }) => (
              <span key={label} className="flex flex-col gap-1 bg-card p-5 transition-colors group-hover:bg-muted/60">
                <span className="text-3xl font-bold tabular-nums tracking-tight">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </span>
            ))}
          </a>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {LAYERS.map(({ layer, intent, name, repo, docs, body }, i) => {
            const meta = repos.get(repo);
            return (
              <li
                key={repo}
                className="hub-card group relative flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <Link
                  href={`${urls.docs}/${docs}`}
                  aria-label={`${name} documentation`}
                  className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className={`${kicker} flex items-center justify-between text-muted-foreground`}>
                  <span>
                    {String(i + 1).padStart(2, "0")} · {layer}
                  </span>
                  {meta && (
                    <span className="inline-flex items-center gap-1 normal-case tracking-normal tabular-nums">
                      <Star className="size-3 fill-current" aria-hidden="true" />
                      {formatStars(meta.stars)}
                    </span>
                  )}
                </p>
                <p className="mt-4 text-sm font-medium text-primary">{intent} →</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <span className="mt-5 flex items-center gap-4 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1">
                    Docs <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <a
                    href={meta?.url ?? `https://github.com/${githubOrg}/${repo}`}
                    target="_blank"
                    rel="noreferrer"
                    // -my/py: a 24px+ hit area without moving the card's layout.
                    className="relative z-10 -my-1 inline-flex items-center gap-1 py-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Github className="size-3.5" aria-hidden="true" /> GitHub <ArrowUpRight className="size-3" aria-hidden="true" />
                  </a>
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className={`${kicker}`}>Looking for</span>
          {LEGACY.map(({ name, status, now, href }) => (
            <span key={name} className="inline-flex items-center gap-2">
              <span className="font-medium text-foreground">{name}</span>
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                {status}
              </span>
              <Link href={href} className="-my-1 py-1 font-medium text-primary hover:underline">
                Use {now} →
              </Link>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
