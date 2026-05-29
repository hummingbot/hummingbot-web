import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GradientText } from "@hummingbot/ui";

export const metadata: Metadata = {
  title: "About — Hummingbot",
  description:
    "Hummingbot Foundation, bounties, the HBOT token, and on-chain governance.",
};

const sections = [
  {
    id: "foundation",
    title: "Foundation",
    body: "Hummingbot Foundation is a not-for-profit that maintains the open source Hummingbot codebase and coordinates its community-driven development. The Foundation stewards the core framework, reviews contributions, and runs the governance process that decides what gets built and maintained.",
    link: { label: "Foundation overview", href: "https://hummingbot.org/about/" },
  },
  {
    id: "bounties",
    title: "Bounties",
    body: "Exchange connectors and protocol integrations are funded through a transparent bounty program. Sponsors fund development and maintenance; community developers claim bounties by building and shipping connectors that pass Foundation QA. It's how Hummingbot reaches 50+ exchanges and keeps them working.",
    link: { label: "Browse bounties", href: "https://github.com/hummingbot/hummingbot/issues" },
  },
  {
    id: "hbot",
    title: "HBOT",
    body: "HBOT is the governance token of the Hummingbot ecosystem. Holders use HBOT to vote on Hummingbot Improvement Proposals (HIPs) — which connectors to build, which features to prioritize, and how the Foundation allocates resources. Governance weight is tied to participation, not just holdings.",
    link: { label: "About HBOT & governance", href: "https://hummingbot.org/governance/" },
  },
  {
    id: "governance",
    title: "Governance",
    body: "Decisions are made on-chain via Snapshot. Anyone can propose a HIP; HBOT holders vote in recurring polls covering connector approvals, roadmap priorities, and protocol changes. Approved proposals enter the development pipeline and are merged after engineering and QA review.",
    link: { label: "Snapshot space", href: "https://snapshot.org/#/hbot.eth" },
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
        <header className="mb-14">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            A <GradientText>community-governed</GradientText> open source project
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-ink-400">
            Hummingbot is built in the open and steered by the people who use it
            — maintained by the Foundation, funded by bounties, and directed by
            HBOT governance.
          </p>
        </header>

        <div className="flex flex-col gap-12">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight">{s.title}</h2>
              <p className="mt-3 text-pretty text-ink-300">{s.body}</p>
              <a
                href={s.link.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
              >
                {s.link.label}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
