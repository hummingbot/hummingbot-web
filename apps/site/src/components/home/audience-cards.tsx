import Link from "next/link";
import { ArrowRight, Blocks, Code2, Landmark, LineChart } from "lucide-react";
import { urls } from "@/config/site";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

// Ways in by audience. They lead into the same sections the nav has (no
// audience-only pages), so nobody has to pick "who they are" to navigate.
const AUDIENCES = [
  {
    icon: LineChart,
    who: "Traders",
    title: "Run a proven strategy",
    body: "Clone an agent that raced with real capital, paper trade it, then run it on your own keys.",
    links: [
      { label: "Browse strategies", href: urls.hub },
      { label: "Install Condor", href: "#install" },
    ],
  },
  {
    icon: Code2,
    who: "Builders & quants",
    title: "Build your own",
    body: "Learn the framework in a Botcamp cohort, then race your agent in the next Cup.",
    links: [
      { label: "Learn with Botcamp", href: urls.botcamp },
      { label: "Read the docs", href: urls.docs },
      { label: "Hackathons", href: urls.hackathons },
    ],
  },
  {
    icon: Blocks,
    who: "Exchanges",
    title: "Bring volume to your venue",
    body: "Maintain a connector, share fees, and sponsor a squad in the Agent Builders Cup.",
    links: [
      { label: "Sponsor & fee share", href: "/foundation/sponsors" },
      { label: "Connector bounties", href: "/bounties" },
    ],
  },
  {
    icon: Landmark,
    who: "HBOT holders",
    title: "Govern Hummingbot",
    body: "Vote on proposals and decide where the Foundation puts its resources.",
    links: [
      { label: "Governance", href: "/foundation/governance" },
      { label: "Proposals", href: "/foundation/proposals" },
    ],
  },
] as const;

/** "Where do you start?" on the home: one card per audience, linking into the shared sections. */
export function AudienceCards() {
  return (
    <section id="start" className="w-full scroll-mt-16 border-b border-border py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <p className={`${kicker} mb-3 text-primary`}>Start here</p>
        <h2 className="mb-10 max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
          Where do you come in?
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map(({ icon: Icon, who, title, body, links }) => (
            <li key={who} className="hub-card flex flex-col rounded-2xl border border-border bg-card p-6">
              <p className={`${kicker} flex items-center gap-2 text-muted-foreground`}>
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {who}
              </p>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <ul className="mt-5 flex flex-col gap-2 text-sm font-semibold">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="group inline-flex items-center gap-1 hover:text-primary">
                      {l.label}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
