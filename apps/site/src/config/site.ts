/** Single source of truth for marketing-site config: nav, socials, links. */

// Docs (Mintlify) + Hub live on their own domains in prod; override with
// NEXT_PUBLIC_DOCS_URL / NEXT_PUBLIC_HUB_URL to point at local instances.
const DOCS = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.hummingbot.org";
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
  {
    label: "Docs",
    href: urls.docs,
    external: true,
    children: [
      { label: "Hummingbot", href: urls.docs, description: "Framework, strategies & connectors" },
      { label: "Condor", href: "/condor", description: "The harness for AI trading agents" },
    ],
  },
  {
    label: "Hub",
    href: urls.hub,
    external: true,
    children: [
      { label: "Strategies", href: `${urls.hub}/strategies`, description: "Market-making, arbitrage & more" },
      { label: "Routines", href: `${urls.hub}/routines`, description: "Schedulable Condor workflows" },
      { label: "Skills", href: `${urls.hub}/skills`, description: "AI-assistant skills for Hummingbot" },
    ],
  },
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

/** The header's primary button: the install commands at the top of the home. */
export const primaryCta = { label: "Get started", href: "/#install" } as const;

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
