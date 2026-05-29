/** Single source of truth for marketing-site config: nav, socials, links. */

// Docs (Mintlify) + Hub live on their own domains in prod; override with
// NEXT_PUBLIC_DOCS_URL / NEXT_PUBLIC_HUB_URL to point at local instances.
const DOCS = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.hummingbot.org";
const HUB = process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.hummingbot.org";

export const urls = {
  docs: DOCS,
  blog: `${DOCS}/blog`,
  releases: `${DOCS}/blog/releases`,
  exchanges: `${DOCS}/exchanges`,
  hub: HUB,
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
  href: `${urls.blog}/introducing-condor`,
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
