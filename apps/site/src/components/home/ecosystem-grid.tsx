import {
  BookOpen,
  Bot,
  ChevronRight,
  Cpu,
  FlaskConical,
  Rocket,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, Section } from "@hummingbot/ui";
import { ecosystem, githubOrg } from "@/config/site";
import { formatStars, getOrgRepos } from "@/lib/github";

const icons: Record<string, LucideIcon> = {
  Cpu,
  Bot,
  FlaskConical,
  Rocket,
  Users,
  BookOpen,
};

export async function EcosystemGrid() {
  const repos = await getOrgRepos();

  return (
    <Section className="bg-ink-999/40">
      <div className="mb-12 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to run a trading operation
        </h2>
        <p className="mt-3 text-pretty text-ink-400">
          One open-source ecosystem — from core engine to AI agents.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ecosystem.map((group) => {
          const Icon = icons[group.icon] ?? Cpu;
          return (
            <Card key={group.category} className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Icon className="size-5 text-brand-magenta" aria-hidden="true" />
                <h3 className="font-semibold">{group.category}</h3>
              </div>
              <ul className="flex flex-col">
                {group.repos.map((name) => {
                  const meta = repos.get(name);
                  const href = meta?.url ?? `https://github.com/${githubOrg}/${name}`;
                  return (
                    <li key={name}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm text-brand-cyan" translate="no">
                              {name}
                            </code>
                            {meta && (
                              <span className="inline-flex items-center gap-0.5 text-xs tabular-nums text-ink-600">
                                <Star className="size-3 fill-current" aria-hidden="true" />
                                {formatStars(meta.stars)}
                              </span>
                            )}
                          </div>
                          {meta?.description && (
                            <p className="truncate text-xs text-ink-500">
                              {meta.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          className="mt-0.5 size-4 shrink-0 text-ink-700 transition-colors group-hover:text-ink-300"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
