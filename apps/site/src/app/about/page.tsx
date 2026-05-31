import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GradientText } from "@hummingbot/ui";
import { urls } from "@/config/site";

export const metadata: Metadata = {
  title: "About — Hummingbot",
  description:
    "Hummingbot Foundation: a not-for-profit maintaining the open source Hummingbot codebase, the HBOT governance token, and a community-driven development process.",
};

const principles = [
  { title: "Open source", body: "The Hummingbot codebase is publicly available, auditable, and free." },
  { title: "Modular", body: "Modules can be independently built, used, and maintained by the community." },
  { title: "Extensible", body: "Build any trading strategy on any exchange and blockchain." },
  { title: "All levels", body: "Designed for individuals and professional trading firms alike." },
];

const directors = [
  {
    name: "Michael Feng",
    role: "Chairman & CEO",
    bio: "Co-founder and CEO of Hummingbot; previously co-founded CoinAlpha. Earlier, traded structured credit at investment banks. MIT and Stanford.",
  },
  {
    name: "Carlo Las Marias",
    role: "Director",
    bio: "Co-founder of Hummingbot; previously co-founder and CTO of CoinAlpha. Engineering and product roles before crypto. MIT.",
  },
  {
    name: "Fernando Martinez",
    role: "Director",
    bio: "Leads connector development and developer relations at Hummingbot Foundation.",
  },
];

const govSteps = [
  { n: "1", title: "Propose", body: "Anyone submits a Hummingbot Improvement Proposal (HIP) to the governance forum." },
  { n: "2", title: "Poll", body: "Approved proposals become Snapshot polls at the start of each month." },
  { n: "3", title: "Vote", body: "HBOT holders vote over roughly a one-week period — one HBOT, one vote." },
  { n: "4", title: "Execute", body: "The Foundation executes the decisions the community votes for." },
];

function SectionLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
    >
      {children}
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </a>
  );
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
        <header className="mb-16">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            A <GradientText>community-governed</GradientText> open source project
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-ink-400">
            Hummingbot is built in the open and steered by the people who use it
            — maintained by the Foundation, funded by bounties, and directed by
            HBOT governance.
          </p>
        </header>

        <div className="flex flex-col gap-16">
          {/* Foundation */}
          <section id="foundation" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight">Foundation</h2>
            <p className="mt-3 text-pretty text-ink-300">
              Hummingbot Foundation is a not-for-profit established in the Cayman
              Islands. Its mission is to democratize high-frequency trading by
              maintaining the open source Hummingbot code repository and the HBOT
              governance system — making sophisticated trading strategies
              accessible to everyone and leveling the playing field for traders
              worldwide.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {principles.map((p) => (
                <div key={p.title} className="rounded-xl border border-ink-800 bg-card p-5">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-ink-400 text-pretty">{p.body}</p>
                </div>
              ))}
            </div>
            <SectionLink href="https://github.com/hummingbot/governance" external>
              Foundation governance forum
            </SectionLink>
          </section>

          {/* History */}
          <section id="history" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight">History</h2>
            <p className="mt-3 text-pretty text-ink-300">
              Hummingbot was originally built and open sourced by CoinAlpha in
              April 2019, pioneering a modular architecture that let external
              developers contribute exchange connectors and strategies into a
              shared, community-maintained codebase. In December 2021, CoinAlpha
              spun off the Hummingbot Foundation as an independent open source
              entity to maintain the repository and administer a decentralized,
              community-driven governance system built around the HBOT token.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a href={`${urls.blog}/hummingbot-whitepaper`} className="text-brand-teal hover:underline">
                Hummingbot whitepaper
              </a>
              <a href={`${urls.blog}/from-hedge-fund-to-market-making-bot-the-hummingbot-origin-story`} className="text-brand-teal hover:underline">
                Origin story
              </a>
              <a href={`${urls.blog}/introducing-the-hummingbot-foundation`} className="text-brand-teal hover:underline">
                Introducing the Foundation
              </a>
            </div>
          </section>

          {/* HBOT */}
          <section id="hbot" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight">HBOT token</h2>
            <p className="mt-3 text-pretty text-ink-300">
              HBOT is the governance token of the Hummingbot ecosystem — a
              standard ERC-20 on Ethereum mainnet with a fixed supply of
              1,000,000,000 (no further minting). Holders submit and vote on
              governance proposals that decide how the Foundation allocates its
              resources. It&apos;s distributed to the community through bounties,
              contribution rewards, and ecosystem grants.
            </p>
            <SectionLink
              href="https://etherscan.io/token/0xe5097d9baeafb89f9bcb78c9290d545db5f9e9cb"
              external
            >
              HBOT contract on Etherscan
            </SectionLink>
          </section>

          {/* Governance */}
          <section id="governance" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight">Governance</h2>
            <p className="mt-3 text-pretty text-ink-300">
              Decisions are made on-chain via Snapshot on a recurring monthly
              cycle. Anyone can propose a HIP; HBOT holders vote in polls
              covering connector approvals, feature priorities, budget
              allocation, and changes to the process itself.
            </p>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2">
              {govSteps.map((s) => (
                <li key={s.n} className="rounded-xl border border-ink-800 bg-card p-5">
                  <span className="font-mono text-sm text-brand-teal">{s.n}</span>
                  <h3 className="mt-1 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-ink-400 text-pretty">{s.body}</p>
                </li>
              ))}
            </ol>
            <SectionLink href="https://snapshot.org/#/hbot.eth" external>
              Snapshot voting space
            </SectionLink>
          </section>

          {/* Board */}
          <section id="board" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight">Board of Directors</h2>
            <p className="mt-3 text-pretty text-ink-300">
              The Foundation is governed by a Board responsible for its strategic
              direction, oversight, and adherence to its bylaws and the community
              governance process.
            </p>
            <div className="mt-6 flex flex-col gap-4">
              {directors.map((d) => (
                <div key={d.name} className="rounded-xl border border-ink-800 bg-card p-5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="font-semibold">{d.name}</h3>
                    <span className="text-sm text-ink-500">{d.role}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-400 text-pretty">{d.bio}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Cross-links */}
          <section className="grid gap-4 sm:grid-cols-2">
            <a
              href="/bounties"
              className="group rounded-xl border border-ink-800 bg-card p-6 transition-colors hover:border-ink-700"
            >
              <h3 className="text-lg font-semibold">Bounties →</h3>
              <p className="mt-1 text-sm text-ink-400 text-pretty">
                How exchange connectors are funded, built, and maintained.
              </p>
            </a>
            <a
              href="/community"
              className="group rounded-xl border border-ink-800 bg-card p-6 transition-colors hover:border-ink-700"
            >
              <h3 className="text-lg font-semibold">Community →</h3>
              <p className="mt-1 text-sm text-ink-400 text-pretty">
                Discord, certification, contribution guidelines, and rewards.
              </p>
            </a>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
