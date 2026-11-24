/** Single source of truth for marketing-site config: nav, socials, links. */

// The docs live in this site (/docs, rendered by lib/docs.ts from the
// hummingbot-site checkout). The Hub isn't live yet; override with
// NEXT_PUBLIC_HUB_URL to point at a local instance.
const DOCS = "/docs";
const HUB = process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.hummingbot.org";

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
  education: "https://www.botcamp.xyz",
  // Botcamp's Strategy Library: strategies and agents that clone into Condor.
  strategyLibrary: "https://www.botcamp.xyz/strategies",
  rewards: "https://xrpliquid.com",
  install: "/install.sh",
  condorInstall: "/condor.sh",
} as const;

/** Docs pages the home and the header link to. */
export const docsPages = {
  installation: "/get-started",
  controllers: `${DOCS}/strategies/v2-strategies/controllers`,
  hummingbotApi: `${DOCS}/hummingbot-api`,
  condor: `${DOCS}/condor`,
} as const;

export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
  children?: { label: string; href: string; description?: string }[];
};

export const nav: NavItem[] = [
  {
    label: "Docs",
    href: urls.docs,
    children: [
      { label: "Get started", href: "/get-started", description: "Install Hummingbot and run your first bot, step by step" },
      { label: "Hummingbot", href: urls.docs, description: "Framework, strategies & connectors" },
      { label: "Condor", href: `${DOCS}/condor`, description: "The harness for AI trading agents" },
    ],
  },
  // The Hub (hub.hummingbot.org) isn't live yet; strategies are in Botcamp's library.
  { label: "Strategies", href: urls.strategyLibrary, external: true },
  { label: "Exchanges", href: "/exchanges" },
  { label: "Volumes", href: "/volumes" },
  { label: "Blog", href: "/blog" },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "Foundation", href: "/about", description: "Mission, history & team" },
      { label: "Bounties", href: "/bounties", description: "How connectors get funded" },
      { label: "Community", href: "/community", description: "Discord, certification & rewards" },
      { label: "Governance", href: "/about#governance", description: "HBOT & on-chain voting" },
    ],
  },
];

/** The header's primary button: the step-by-step install guide. */
export const primaryCta = { label: "Get started", href: "/get-started" } as const;

/** Secondary pages, linked from the footer. */
export const footerLinks: { label: string; href: string }[] = [
  { label: "Exchanges", href: "/exchanges" },
  { label: "Volumes", href: "/volumes" },
  { label: "Blog", href: "/blog" },
  { label: "Bounties", href: "/bounties" },
  { label: "Community", href: "/community" },
  { label: "Education", href: urls.education },
];

export const announcement = {
  text: "Introducing Condor 🦅 — The Open Source Harness for Trading Agents",
  href: `${urls.blog}/introducing-condor`,
} as const;

export const githubOrg = "hummingbot";
