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

// Top-level nav names what people do or look for, not internal brands
// (Botcamp lives under Learn, like LangChain/Vercel Academy). Products maps the
// pieces users confuse most; audiences get cards on the home, not nav items.
export const nav: NavItem[] = [
  {
    label: "Products",
    href: "/#products",
    children: [
      { label: "Condor", href: `${DOCS}/condor`, description: "Run and talk to AI trading agents, from Telegram" },
      { label: "Hummingbot Client", href: `${DOCS}/client`, description: "The open source engine: connectors and strategies" },
      { label: "Hummingbot API", href: `${DOCS}/hummingbot-api`, description: "Deploy and manage many bots from one server" },
      { label: "Gateway", href: `${DOCS}/gateway`, description: "Trade on DEXs and land transactions on-chain" },
      { label: "Which one do I need?", href: "/#products" },
    ],
  },
  { label: "Strategies", href: urls.hub },
  {
    label: "Learn",
    href: urls.botcamp,
    children: [
      { label: "Botcamp", href: urls.botcamp, description: "Hummingbot's training and certification program" },
      { label: "Cohorts", href: urls.cohorts, description: "Live, guided cohorts to build your first agent" },
      { label: "Courses", href: urls.courses, description: "Self-paced courses, from basics to advanced" },
      { label: "Docs & guides", href: urls.docs, description: "Reference, quickstarts and walkthroughs" },
    ],
  },
  { label: "Hackathons", href: urls.hackathons },
  { label: "Docs", href: urls.docs },
  {
    label: "Community",
    href: "/community",
    children: [
      { label: "Community", href: "/community", description: "Discord, Telegram and where to get help" },
      { label: "Bounties", href: "/bounties", description: "Get paid to build connectors and features" },
      { label: "For exchanges", href: "/foundation/sponsors", description: "List a connector, sponsor a hackathon, fee share" },
      { label: "Foundation", href: "/foundation", description: "Who maintains Hummingbot and HBOT governance" },
    ],
  },
];

/** The header's primary call to action: clone a strategy into Condor. */
export const primaryCta = { label: "Run a strategy", href: urls.hub } as const;

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
