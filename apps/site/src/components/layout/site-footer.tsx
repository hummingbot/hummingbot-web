import { ArrowUpRight, Github, MessageCircle, Twitter, Youtube } from "lucide-react";
import Link from "next/link";
import { urls } from "@/config/site";
import { Logo } from "./logo";

type Col = { title: string; links: { label: string; href: string; external?: boolean }[] };

const columns: Col[] = [
  {
    title: "Resources",
    links: [
      { label: "Docs", href: urls.docs, external: true },
      { label: "Hub", href: urls.hub, external: true },
      { label: "Blog", href: "/blog" },
      { label: "Volumes", href: "/volumes" },
      { label: "Exchanges", href: urls.exchanges, external: true },
      { label: "Discord", href: urls.discord, external: true },
      { label: "GitHub", href: urls.github, external: true },
    ],
  },
  {
    title: "Ecosystem",
    links: [
      { label: "Hummingbot", href: "https://github.com/hummingbot/hummingbot", external: true },
      { label: "Condor", href: "https://github.com/hummingbot/condor", external: true },
      { label: "Gateway", href: "https://github.com/hummingbot/gateway", external: true },
      { label: "Dashboard", href: "https://github.com/hummingbot/dashboard", external: true },
      { label: "Hummingbot API", href: "https://github.com/hummingbot/hummingbot-api", external: true },
      { label: "MCP", href: "https://github.com/hummingbot/mcp", external: true },
      { label: "Quants Lab", href: "https://github.com/hummingbot/quants-lab", external: true },
    ],
  },
  {
    title: "Foundation",
    links: [
      { label: "About", href: "/about" },
      { label: "Governance", href: "/about#governance" },
      { label: "HBOT", href: "/about#hbot" },
      { label: "Bounties", href: "/about#bounties" },
      { label: "Rewards", href: urls.rewards, external: true },
      { label: "Education", href: urls.education, external: true },
      { label: "Contributing", href: "https://github.com/hummingbot/hummingbot/blob/master/CONTRIBUTING.md", external: true },
    ],
  },
];

const socials = [
  { label: "X", href: urls.x, Icon: Twitter },
  { label: "Discord", href: urls.discord, Icon: MessageCircle },
  { label: "YouTube", href: urls.youtube, Icon: Youtube },
  { label: "GitHub", href: urls.github, Icon: Github },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-800 bg-ink-999">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-ink-500 text-pretty">
            The open source framework for agentic trading strategies. Built by
            market makers worldwide.
          </p>
          <div className="flex gap-1">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex size-9 items-center justify-center rounded-md text-ink-400 hover:bg-ink-900 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-ink-500">
              {col.title}
            </h2>
            <ul className="flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-foreground"
                  >
                    {l.label}
                    {l.external && <ArrowUpRight className="size-3 opacity-50" aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-ink-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-ink-600 sm:flex-row">
          <p>© {new Date().getFullYear()} Hummingbot Foundation. Apache 2.0.</p>
          <p>Built by market makers worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
