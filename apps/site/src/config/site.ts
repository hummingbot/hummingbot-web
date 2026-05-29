/** Single source of truth for marketing-site config: nav, socials, links. */

export const urls = {
  docs: "https://docs.hummingbot.org",
  blog: "https://docs.hummingbot.org/blog",
  releases: "https://docs.hummingbot.org/blog/releases",
  exchanges: "https://docs.hummingbot.org/exchanges",
  hub: "https://hub.hummingbot.org",
  github: "https://github.com/hummingbot",
  discord: "https://discord.gg/hummingbot",
  x: "https://x.com/_hummingbot",
  youtube: "https://youtube.com/@hummingbot",
  education: "https://www.botcamp.xyz",
  rewards: "https://xrpliquid.com",
  install: "/install.sh",
  condorInstall: "/condor.sh",
} as const;

export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
  children?: { label: string; href: string; description?: string }[];
};

export const nav: NavItem[] = [
  { label: "Docs", href: urls.docs, external: true },
  {
    label: "Hub",
    href: urls.hub,
    external: true,
    children: [
      { label: "Strategies", href: `${urls.hub}/strategies`, description: "Market-making, arbitrage & more" },
      { label: "Routines", href: `${urls.hub}/routines`, description: "Schedulable Condor workflows" },
      { label: "Agents", href: `${urls.hub}/agents`, description: "Autonomous trading harnesses" },
    ],
  },
  { label: "Volumes", href: "/volumes" },
  { label: "Blog", href: urls.blog, external: true },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "Foundation", href: "/about#foundation" },
      { label: "Bounties", href: "/about#bounties" },
      { label: "HBOT", href: "/about#hbot" },
      { label: "Governance", href: "/about#governance" },
    ],
  },
];

export const announcement = {
  text: "Introducing Condor 🦅 — The Open Source Harness for Trading Agents",
  href: `${urls.blog}/introducing-condor-the-open-source-harness-for-trading-agents`,
} as const;

/** GitHub org repos grouped for the EcosystemGrid (descriptions/stars fetched live). */
export const ecosystem: { category: string; icon: string; repos: string[] }[] = [
  { category: "Core Trading", icon: "Cpu", repos: ["hummingbot", "gateway", "hummingbot-api"] },
  { category: "AI Agents", icon: "Bot", repos: ["condor", "mcp", "skills"] },
  { category: "Research & Backtesting", icon: "FlaskConical", repos: ["quants-lab", "dashboard", "bot-battle"] },
  { category: "Deploy & Ops", icon: "Rocket", repos: ["deploy", "brokers", "hummingbot-api-client"] },
  { category: "Clients & Community", icon: "Users", repos: ["hbot-remote-client-py", "community-tools", "awesome-hummingbot"] },
  { category: "Docs & Data", icon: "BookOpen", repos: ["hummingbot-site", "condor-docs", "datadog"] },
];

export const githubOrg = "hummingbot";
