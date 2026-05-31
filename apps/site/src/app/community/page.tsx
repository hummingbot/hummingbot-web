import type { Metadata } from "next";
import { ArrowUpRight, Award, MessageCircle, Code2, Gift } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GradientText } from "@hummingbot/ui";
import { urls } from "@/config/site";

export const metadata: Metadata = {
  title: "Community — Hummingbot",
  description:
    "Join the global Hummingbot community of algorithmic traders, market makers, and developers: Discord, Botcamp certification, contribution guidelines, and rewards.",
};

const cards = [
  {
    icon: MessageCircle,
    title: "Discord",
    body: "The central hub for the community — support channels, connector and bot help, dev chat, and official announcements.",
    cta: { label: "Join the server", href: urls.discord },
  },
  {
    icon: Award,
    title: "Certification",
    body: "Botcamp certification demonstrates you can build, backtest, and deploy custom strategies on the Hummingbot V2 framework. Certified developers can publish on the Hub.",
    cta: { label: "Learn about Botcamp", href: urls.education },
  },
  {
    icon: Code2,
    title: "Contribute",
    body: "Hummingbot is a bazaar-style open source project. Follow the contribution guidelines to add connectors, strategies, and fixes — and earn bounties.",
    cta: { label: "Contribution guide", href: "https://github.com/hummingbot/hummingbot/blob/master/CONTRIBUTING.md" },
  },
  {
    icon: Gift,
    title: "Rewards",
    body: "Earn through community programs like XRPLiquid, a liquidity rewards program for providing liquidity on the XRP Ledger with Hummingbot.",
    cta: { label: "Explore XRPLiquid", href: urls.rewards },
  },
];

export default function CommunityPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
        <header className="mb-14">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Built by a global <GradientText>community</GradientText>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-ink-400">
            A worldwide network of algorithmic traders, market makers, and
            developers who use and build the Hummingbot ecosystem. Here&apos;s
            how to get involved.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map(({ icon: Icon, title, body, cta }) => (
            <section key={title} className="flex flex-col rounded-xl border border-ink-800 bg-card p-6">
              <Icon className="size-6 text-brand-teal" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-400 text-pretty">{body}</p>
              <a
                href={cta.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
              >
                {cta.label}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-xl border border-ink-800 bg-ink-999/40 p-6 text-center">
          <h2 className="text-lg font-semibold">Code of conduct</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-400 text-pretty">
            All community members are expected to be respectful, helpful, and
            constructive. We&apos;re here to help each other build better trading
            systems in the open.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
