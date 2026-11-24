import { ArrowUpRight, Bot, LineChart, Workflow, type LucideIcon } from "lucide-react";
import { urls } from "@/config/site";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

const CARDS: { title: string; Icon: LucideIcon; desc: string; href: string; cmd: string }[] = [
  {
    title: "Strategies",
    Icon: LineChart,
    desc: "Market making, arbitrage, and directional bots: Hummingbot scripts and V2 controllers.",
    href: `${urls.hub}/strategies`,
    cmd: "hummingbot install @author/name",
  },
  {
    title: "Routines",
    Icon: Workflow,
    desc: "Declarative, schedulable Condor workflows that orchestrate your trading.",
    href: `${urls.hub}/routines`,
    cmd: "condor install @author/name",
  },
  {
    title: "Skills",
    Icon: Bot,
    desc: "Installable skills that let AI assistants operate Hummingbot through natural language.",
    href: `${urls.hub}/skills`,
    cmd: "npx skills add hummingbot/skills --skill name",
  },
];

/**
 * Strategies on the home: the community registry (the Hub) and its three
 * primitives, each installable in one command.
 */
export function HubSection() {
  return (
    <section id="strategies" className="w-full scroll-mt-16 border-b border-border py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <p className={`${kicker} mb-4 text-muted-foreground`}>Hummingbot Hub</p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
            Strategies, ready to install.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Three primitives, one community registry. Install any of them in a single command.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {CARDS.map(({ title, Icon, desc, href, cmd }) => (
            <li key={title}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="hub-card group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-colors group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-5 text-xl font-semibold tracking-tight">{title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{desc}</span>
                <code
                  className="mt-5 block truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground"
                  translate="no"
                >
                  {cmd}
                </code>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
