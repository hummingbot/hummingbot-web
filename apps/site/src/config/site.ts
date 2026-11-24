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
  signin: "/signin",
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

// Top-level nav names what an algo trader does or looks for, not internal
// brands (Botcamp lives under Learn). Each menu keeps only what that reader
// needs: "Get started" is the header button, Docs is its own item, and pages
// for exchanges and members are linked from the footer.
export const nav: NavItem[] = [
  {
    label: "Products",
    href: "/get-started",
    children: [
      { label: "Condor", href: "/get-started?path=condor", description: "Run AI trading agents and bots from Telegram" },
      { label: "Hummingbot Client", href: "/get-started?path=client", description: "Code your own strategies, with connectors to every exchange" },
      { label: "Hummingbot API", href: `${DOCS}/hummingbot-api`, description: "Run and backtest many bots from one server" },
      { label: "Gateway", href: `${DOCS}/gateway`, description: "Trade on DEXs and land transactions on-chain" },
    ],
  },
  { label: "Strategies", href: urls.hub },
  {
    label: "Learn",
    href: urls.botcamp,
    children: [
      { label: "Botcamp", href: urls.botcamp, description: "Hummingbot's training and certification program" },
      { label: "Courses", href: urls.courses, description: "Self-paced courses, from basics to advanced" },
      { label: "Cohorts", href: urls.cohorts, description: "Live, guided cohorts to build your own agent" },
    ],
  },
  { label: "Hackathons", href: urls.hackathons },
  { label: "Docs", href: urls.docs },
  {
    label: "Community",
    href: "/community",
    children: [
      { label: "Discord & help", href: "/community", description: "Where to ask questions and meet other traders" },
      { label: "Bounties", href: "/bounties", description: "Get paid to build connectors and features" },
      { label: "Foundation", href: "/foundation", description: "Who maintains Hummingbot, and HBOT governance" },
    ],
  },
];

/** Secondary pages, linked from the footer instead of the header. */
export const footerLinks: { label: string; href: string }[] = [
  { label: "Exchanges", href: urls.exchanges },
  { label: "Volume", href: "/volumes" },
  { label: "Builders", href: "/builders" },
  { label: "For exchanges", href: "/foundation/sponsors#exchange-partners" },
  { label: "Blog", href: urls.blog },
  { label: "Terms", href: "/terms" },
];

/** The header's primary call to action: clone a strategy into Condor. */
export const primaryCta = { label: "Get started", href: "/get-started" } as const;

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
