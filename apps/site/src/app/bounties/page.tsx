import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GradientText } from "@hummingbot/ui";
import { urls } from "@/config/site";

export const metadata: Metadata = {
  title: "Bounties — Hummingbot",
  description:
    "How Hummingbot Foundation funds exchange connectors through a transparent bounty program: sponsors fund the work, community developers build and maintain it.",
};

const BOARD = "https://github.com/orgs/hummingbot/projects/7/views/1";

const roles = [
  { who: "Sponsors", body: "Exchanges and protocols fund bounties to get a professionally-maintained, open source connector for their venue." },
  { who: "Developers", body: "Community members claim bounties — building and maintaining connectors to Hummingbot's standards and earning rewards." },
  { who: "The Foundation", body: "Administers the program, reviews each connector for quality and security, and merges approved work." },
];

const tiers = [
  { tier: "Gold", body: "Fully sponsored with priority maintenance — tested regularly and kept current with the latest exchange API changes." },
  { tier: "Silver", body: "Sponsored and maintained, at a lower priority than gold tier." },
  { tier: "Bronze", body: "Community-maintained with minimal sponsorship." },
];

const lifecycle = [
  "An exchange or protocol sponsors a connector by funding a bounty.",
  "A developer claims the bounty and begins work.",
  "The developer builds the connector following Hummingbot's standards.",
  "The Foundation reviews it for quality and security.",
  "Once approved, the connector is merged into the codebase.",
  "The developer maintains it and earns ongoing rewards.",
];

export default function BountiesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
        <header className="mb-16">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Connectors, funded by <GradientText>bounties</GradientText>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-ink-400">
            Hummingbot reaches 50+ exchanges through a transparent bounty
            program. Sponsors fund development and maintenance; community
            developers claim bounties by building and shipping connectors that
            pass Foundation QA.
          </p>
          <a
            href={BOARD}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-brand-teal px-4 py-2 text-sm font-semibold text-ink-999 transition-opacity hover:opacity-90"
          >
            Browse the bounty board
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </header>

        <div className="flex flex-col gap-16">
          <section>
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {roles.map((r) => (
                <div key={r.who} className="rounded-xl border border-ink-800 bg-card p-5">
                  <h3 className="font-semibold text-brand-teal">{r.who}</h3>
                  <p className="mt-1 text-sm text-ink-400 text-pretty">{r.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight">Connector tiers</h2>
            <p className="mt-3 text-pretty text-ink-300">
              Connectors are organized by their level of sponsorship and
              maintenance.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {tiers.map((t) => (
                <div
                  key={t.tier}
                  className="flex flex-col gap-1 rounded-xl border border-ink-800 bg-card p-5 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <h3 className="w-20 shrink-0 font-semibold">{t.tier}</h3>
                  <p className="text-sm text-ink-400 text-pretty">{t.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight">Bounty lifecycle</h2>
            <ol className="mt-6 flex flex-col gap-3">
              {lifecycle.map((step, i) => (
                <li key={i} className="flex gap-4 rounded-xl border border-ink-800 bg-card p-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-900 font-mono text-sm text-brand-teal">
                    {i + 1}
                  </span>
                  <p className="self-center text-sm text-ink-300 text-pretty">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight">Rewards</h2>
            <p className="mt-3 text-pretty text-ink-300">
              Developers earn a one-time <strong className="text-foreground">build reward</strong> for
              shipping a new connector and ongoing{" "}
              <strong className="text-foreground">maintenance rewards</strong> for keeping it working.
              Rewards are paid in a combination of stablecoins and HBOT tokens.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <a
                href="https://github.com/hummingbot/hummingbot/blob/master/CONTRIBUTING.md"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-ink-800 bg-card p-6 transition-colors hover:border-ink-700"
              >
                <h3 className="text-lg font-semibold">Contributors guide →</h3>
                <p className="mt-1 text-sm text-ink-400 text-pretty">
                  Standards, checklists, and how to claim your first bounty.
                </p>
              </a>
              <a
                href={urls.discord}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-ink-800 bg-card p-6 transition-colors hover:border-ink-700"
              >
                <h3 className="text-lg font-semibold">Join Discord →</h3>
                <p className="mt-1 text-sm text-ink-400 text-pretty">
                  Coordinate with maintainers in <span translate="no">#connector-dev</span>.
                </p>
              </a>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
