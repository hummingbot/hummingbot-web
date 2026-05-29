import { ArrowUpRight, Bot, LineChart, Workflow } from "lucide-react";
import { Card, Section } from "@hummingbot/ui";
import { urls } from "@/config/site";

const cards = [
  {
    title: "Strategies",
    icon: LineChart,
    desc: "Market-making, arbitrage, and directional bots — Hummingbot scripts & v2 controllers.",
    href: `${urls.hub}/strategies`,
    cmd: "hummingbot install @author/name",
  },
  {
    title: "Routines",
    icon: Workflow,
    desc: "Declarative, schedulable Condor workflows that orchestrate your trading.",
    href: `${urls.hub}/routines`,
    cmd: "condor install @author/name",
  },
  {
    title: "Agents",
    icon: Bot,
    desc: "Autonomous trading harnesses that reason, plan, and execute on your behalf.",
    href: `${urls.hub}/agents`,
    cmd: "condor install @author/name",
  },
];

export function BuildCards() {
  return (
    <Section>
      <div className="mb-12 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          What you can build
        </h2>
        <p className="mt-3 text-pretty text-ink-400">
          Three primitives, one community registry. Install any of them in a
          single command.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ title, icon: Icon, desc, href, cmd }) => (
          <a
            key={title}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full p-6 transition-colors group-hover:border-ink-700">
              <div className="flex items-center justify-between">
                <Icon className="size-6 text-brand-teal" aria-hidden="true" />
                <ArrowUpRight className="size-4 text-ink-600 transition-colors group-hover:text-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-ink-400 text-pretty">{desc}</p>
              <code className="mt-4 block truncate rounded-md bg-ink-950 px-3 py-2 font-mono text-xs text-ink-400" translate="no">
                {cmd}
              </code>
            </Card>
          </a>
        ))}
      </div>
    </Section>
  );
}
