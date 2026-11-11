/** Single source of truth for marketing-site config: nav, socials, links. */

// Docs (/docs, lib/docs.ts) and the Hub (/hub, lib/hub.ts) live in this site.
const DOCS = "/docs";
const HUB = "/hub";

export const urls = {
  docs: DOCS,
  blog: "/blog",
  releases: `${DOCS}/release-notes`,
  exchanges: "/exchanges",
  exchangesDocs: `${DOCS}/exchanges`,
  hub: HUB,
  github: "https://github.com/hummingbot/hummingbot",
  discord: "https://discord.gg/hummingbot",
  x: "https://x.com/_hummingbot",
  youtube: "https://youtube.com/@hummingbot",
  // Botcamp cohort questions before enrolling (the public cohort chat).
  telegram: "https://t.me/botcampcohorts",
  botcamp: "/botcamp",
  cohorts: "/botcamp#cohorts",
  courses: "/botcamp#courses",
  hackathons: "/hackathons",
  // Placeholder until accounts move over from Botcamp.
  signup: "/signup",
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

// The site's essential sections in two groups: first the community loop that
// comes from Botcamp — clone a strategy, learn to build one (Botcamp), race it
// (Hackathons) — then Hummingbot's own: Docs, Bounties, and the Foundation.
// Flat, like Botcamp's header.
export const nav: NavItem[] = [
  { label: "Strategies", href: urls.hub },
  { label: "Botcamp", href: urls.botcamp },
  { label: "Hackathons", href: urls.hackathons },
  { label: "Docs", href: urls.docs },
  { label: "Bounties", href: "/bounties" },
  { label: "Foundation", href: "/foundation" },
];

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
