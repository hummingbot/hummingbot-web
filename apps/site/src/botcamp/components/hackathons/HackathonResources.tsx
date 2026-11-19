import Link from "next/link"
import {
  ExternalLink,
  ArrowRight,
  PlayCircle,
  BookOpen,
  Wrench,
  MessageCircle,
  Building2,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { Button } from "@/botcamp/components/ui/button"
import TableOfContents, { MobileTableOfContents } from "@/botcamp/components/lessons/TableOfContents"
import { ELIGIBLE_EXCHANGES, EXCHANGE_API_LINKS } from "@/botcamp/lib/hackathon-squads"
import { HackathonRules } from "@/botcamp/components/hackathons/HackathonRules"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { StrategyCard } from "@/botcamp/components/strategies/StrategyCard"
import { StarterKitPanel } from "@/botcamp/components/hackathons/StarterKitPanel"
import type { StarterKit } from "@/botcamp/lib/hackathon-starter-kit"

const DISCORD_URL = "https://discord.gg/hummingbot"

/** A card shown under a build path — a Strategy record, or a reference
 *  strategy hosted elsewhere (identified by an explicit external href). */
type ExampleStrategy = {
  strategy: React.ComponentProps<typeof StrategyCard>["strategy"]
  href?: string
}

interface HackathonResourcesProps {
  hackathonSlug: string
  /** isRegistrationOpen() — hides the "Start your application" link once closed. */
  applicationsOpen: boolean
  rules: React.ComponentProps<typeof HackathonRules>
  starterKit: StarterKit
  /** Certified submissions shown under each build path. */
  controllerExamples: ExampleStrategy[]
  agentExamples: ExampleStrategy[]
  /** Competition stages with their date ranges and progress state. */
  timeline: {
    phases: Array<{
      label: string
      date: string | null
      desc: string
      status: "done" | "current" | "upcoming"
    }>
    winnersAnnounced: string
  }
  /** Sponsoring venues fielding teams — the host team is excluded. */
  sponsorTeams: Array<{
    id: string
    slug: string
    name: string
    logoUrl: string | null
    logoUrlDark: string | null
  }>
}

type ResourceItem = { label: string; description: string; href: string; icon?: LucideIcon }

// Controller path — videos, blog guides, and docs merged into one dense list
// so it reads as "everything about Controllers" at a glance.
const CONTROLLER_RESOURCES: ResourceItem[] = [
  {
    label: "Understanding Market Making Controllers (Part 1)",
    description: "Federico breaks down how V2 market making controllers work, live.",
    href: "https://www.youtube.com/watch?v=qxPdDMWZrss",
    icon: PlayCircle,
  },
  {
    label: "Understanding Market Making Controllers (Part 2)",
    description: "Continuation — deeper into controller configuration and tuning.",
    href: "https://www.youtube.com/watch?v=M8H0GtWASkQ",
    icon: PlayCircle,
  },
  {
    label: "V2 Controllers — Overview",
    description: "What a v2 controller is and how it fits into Hummingbot.",
    href: "https://hummingbot.org/strategies/v2-strategies/controllers/",
    icon: BookOpen,
  },
  {
    label: "V2 Controllers — Walkthrough",
    description: "Step-by-step guide to building your own controller.",
    href: "https://hummingbot.org/strategies/v2-strategies/walkthrough-controller/",
    icon: Wrench,
  },
  {
    label: "How to Configure a V2 Strategy Controller",
    description: "Setting up a controller in Hummingbot, step by step.",
    href: "https://hummingbot.org/blog/how-to-configure-a-v2-strategy-controller-in-hummingbot/",
    icon: BookOpen,
  },
  {
    label: "Strategy Guide: Grid Strike",
    description: "A grid-based controller with dynamic risk management.",
    href: "https://hummingbot.org/blog/strategy-guide-grid-strike/",
    icon: BookOpen,
  },
]

// Condor Agent path — same shape as Controllers above, kept as its own list
// rather than folded into a generic "resources" pile.
const AGENT_RESOURCES: ResourceItem[] = [
  {
    label: "Introducing Condor",
    description: "The open-source harness connecting LLMs to Hummingbot's trading infrastructure.",
    href: "https://hummingbot.org/blog/introducing-condor-the-open-source-harness-for-trading-agents/",
    icon: BookOpen,
  },
  {
    label: "Creating AI Trading Agents in Condor",
    description: "Live walkthrough of building an autonomous trading agent in Condor.",
    href: "https://www.youtube.com/watch?v=_f9Jvqr-wnI",
    icon: PlayCircle,
  },
  {
    label: "The Bot Pod Ep. 1 — Trading Agents in Condor",
    description: "Hummingbot's weekly livestream — building an agent from scratch.",
    href: "https://www.youtube.com/watch?v=O93R_ddB-8o",
    icon: PlayCircle,
  },
  {
    label: "The Bot Pod Ep. 11 — Agent Builders Cup Kickoff",
    description: "Hackathon kickoff session, F1-style finals, and Condor sub-agent architecture.",
    href: "https://condor.hummingbot.org/podcast/ep11",
    icon: PlayCircle,
  },
  {
    label: "Condor Docs",
    description: "Framework docs — setup, architecture, and building your first agent.",
    href: "https://condor.hummingbot.org",
    icon: BookOpen,
  },
]

// Kept in sync with the section ids below — this is the only place page
// structure is declared, so the sidebar TOC can never drift from the content.
// Only top-level sections are listed; the Controller/Agent subsections live
// inside "What You Can Build" and are left out to keep the nav short.
const TOC_ITEMS = [
  { id: "rules", text: "Official Rules", level: 2 },
  { id: "starter-kit", text: "Starter Kit", level: 2 },
  { id: "build", text: "What You Can Build", level: 2 },
  { id: "exchanges", text: "Exchange Sponsors", level: 2 },
  { id: "timeline", text: "Hackathon Timeline", level: 2 },
  { id: "support", text: "Getting Support", level: 2 },
]

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl md:text-2xl font-bold tracking-bc-tight mb-2">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

/** A dense list of link rows — the shared shape for every resource category below. */
function ResourceList({
  items,
  fallbackIcon: FallbackIcon = ExternalLink,
}: {
  items: ResourceItem[]
  fallbackIcon?: LucideIcon
}) {
  return (
    <div className="overflow-hidden rounded-bc-lg border border-border">
      {items.map((item, i) => {
        const Icon = item.icon ?? FallbackIcon
        return (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40",
              i < items.length - 1 && "border-b border-border",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </a>
        )
      })}
    </div>
  )
}

/** One eligible path (Controller or Condor Agent) — its own anchored
 * subsection with a resource list plus real, certified submissions to study,
 * rendered with the same StrategyCard used across /strategies. */
function PathSection({
  id,
  title,
  description,
  items,
  examples,
  examplesTitle,
}: {
  id: string
  title: string
  description: string
  items: ResourceItem[]
  examples: ExampleStrategy[]
  examplesTitle: string
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mb-3 mt-1.5 text-sm text-muted-foreground">{description}</p>

      <ResourceList items={items} />

      {examples.length > 0 && (
        <div className="mt-8">
          <h4 className="text-base font-semibold">{examplesTitle}</h4>
          <p className="mb-3 mt-1.5 text-sm text-muted-foreground">
            Real submissions to study — full code and strategy.md.
          </p>
          {/* Stacked full-width rows — the same layout as /strategies. */}
          <div className="space-y-bc-3">
            {examples.map((example, i) => (
              <StrategyCard
                key={example.strategy.slug}
                strategy={example.strategy}
                href={example.href}
                animationDelay={i * 30}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Reference material for a hackathon — a two-column docs layout (content +
 * sticky "on this page" nav) rather than a scrolling marketing page, so
 * builders can scan what's here and jump straight to it.
 */
export function HackathonResources({
  hackathonSlug,
  applicationsOpen,
  rules,
  starterKit,
  controllerExamples,
  agentExamples,
  sponsorTeams,
  timeline,
}: HackathonResourcesProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex gap-x-10 pt-6 pb-10 md:pt-8 md:pb-14">
          <div className="w-full flex-1 min-w-0 space-y-bc-14">
            {/* Mobile "on this page" guide — the sidebar TOC is hidden below
                `lg`, so surface the same jump-to-section nav as a dropdown
                pinned above the content instead of losing it entirely. */}
            <MobileTableOfContents items={TOC_ITEMS} className="lg:hidden" />

            {/* Official Rules — the authoritative version of what's teased on
                the hackathon landing page, written as numbered articles. */}
            <section id="rules" className="scroll-mt-20">
              <SectionHeading
                title="Official Rules"
                description="The rules of record for this competition. Expand any article for the full text."
              />
              <HackathonRules {...rules} />
            </section>

            {/* Starter Kit — the fixed values every agent uses, so racers
                don't invent their own and have them fixed mid-race. */}
            <section id="starter-kit" className="scroll-mt-20 border-t border-border pt-10">
              <SectionHeading
                title="Starter Kit"
                description="The values every agent must use. Build with these from day one — agents that don't match get fixed before the race, not during it."
              />
              <StarterKitPanel
                kit={starterKit}
                downloadHref={`/api/hackathons/${hackathonSlug}/starter-kit`}
              />
            </section>

            {/* What You Can Build — split by eligible path so Controllers and
                Condor Agents each read as their own thing. */}
            <section id="build" className="scroll-mt-20 border-t border-border pt-10">
              <SectionHeading
                title="What You Can Build"
                description="Videos, guides, code, and a real example for each of the two eligible paths."
              />

              <p className="-mt-2 mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Build a trading strategy that trades on one of the sponsoring venues. You can build
                it either as a <span className="text-foreground">Hummingbot V2 Controller</span> —
                rule-based logic that runs natively inside Hummingbot — or as a{" "}
                <span className="text-foreground">Condor Agent</span>, an LLM-driven agent that
                reasons about live market conditions. Both race on equal footing, so pick the
                abstraction that fits the strategy you want to run.
              </p>

              <div className="space-y-bc-8">
                <PathSection
                  id="controllers"
                  title="Building Controllers"
                  description="Rule-based decision logic — when to enter, exit, or adjust."
                  items={CONTROLLER_RESOURCES}
                  examples={controllerExamples}
                  examplesTitle="Controller Strategy Examples"
                />
                <PathSection
                  id="agents"
                  title="Building Agents"
                  description="An LLM-driven agent that reasons about market conditions and decides what to do."
                  items={AGENT_RESOURCES}
                  examples={agentExamples}
                  examplesTitle="Agent Strategy Examples"
                />
              </div>

              {applicationsOpen && (
                <Link
                  href={`/hackathons/${hackathonSlug}/apply`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Start your application
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </section>

            {/* Exchange Sponsors — who's fielding teams, then how to connect
                to their venues. */}
            <section id="exchanges" className="scroll-mt-20 border-t border-border pt-10">
              <SectionHeading
                title="Exchange Sponsors"
                description="The venues fielding teams in this competition."
              />

              <p className="-mt-2 mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                To maximize your chances of being selected, your strategy should ideally trade on a
                sponsoring exchange. Each team picks the agents and controllers that best fit its
                own venue.
              </p>

              {sponsorTeams.length > 0 && (
                <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {sponsorTeams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/hackathons/${hackathonSlug}/teams/${team.slug}`}
                      className="flex items-center gap-3 rounded-bc-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <TeamLogoBadge
                        logoUrl={team.logoUrl}
                        logoUrlDark={team.logoUrlDark}
                        alt={team.name}
                        className="h-10 w-10 shrink-0 rounded-bc-md"
                        imageSize={26}
                        iconClassName="h-4 w-4"
                      />
                      <span className="min-w-0 truncate text-sm font-medium">{team.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-base font-semibold">Eligible Exchanges</h3>
                <p className="mb-3 mt-1.5 text-sm text-muted-foreground">
                  Agents may trade on any of these venues during the race.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ELIGIBLE_EXCHANGES.map((exchange) => (
                    <span
                      key={exchange}
                      className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"
                    >
                      {exchange}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold">Connector Guides</h3>
                <p className="mb-3 mt-1.5 text-sm text-muted-foreground">
                  How to configure each eligible venue&apos;s connector in Hummingbot.
                </p>
                <ResourceList
                  items={ELIGIBLE_EXCHANGES.flatMap((exchange) => {
                    const link = EXCHANGE_API_LINKS[exchange]
                    if (!link) return []
                    return [{ label: exchange, description: link.note, href: link.docsUrl }]
                  })}
                  fallbackIcon={Building2}
                />
              </div>
            </section>

            {/* Hackathon Timeline — the same stages as the landing page, as a
                compact dated list rather than a marketing surface. */}
            <section id="timeline" className="scroll-mt-20 border-t border-border pt-10">
              <SectionHeading
                title="Hackathon Timeline"
                description="The key dates of the competition, from registration through the finals."
              />

              <ol className="relative space-y-bc-6 border-l border-border pl-6">
                {timeline.phases.map((phase) => (
                  <li key={phase.label} className="relative">
                    {/* Marker sits on the rail — filled for stages reached. */}
                    <span
                      className={cn(
                        "absolute -left-[1.8125rem] top-1.5 h-2.5 w-2.5 rounded-full border-2",
                        phase.status === "upcoming"
                          ? "border-border bg-background"
                          : "border-primary bg-primary",
                        phase.status === "current" && "ring-4 ring-primary/20",
                      )}
                    />
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-base font-semibold">{phase.label}</h3>
                      {phase.date && (
                        <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                          {phase.date}
                        </span>
                      )}
                      {phase.status === "current" && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                          Now
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {phase.desc}
                    </p>
                  </li>
                ))}
              </ol>

              <p className="mt-6 text-sm text-muted-foreground">
                Winners are announced on{" "}
                <span className="text-foreground">{timeline.winnersAnnounced}</span>.
              </p>
            </section>

            {/* Support & Community */}
            <section id="support" className="scroll-mt-20 border-t border-border pt-10">
              <SectionHeading
                title="Getting Support"
                description="Reach the Botcamp team and other builders during the race."
              />

              {/* Discord is where the race actually happens — lead with it as a
                  CTA instead of burying it in a row of equal-weight links. */}
              <div className="rounded-bc-xl border border-primary/30 bg-primary/5 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      Join the #hackathon channel on Discord
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Talk with other builders, ask the Botcamp team questions, and get help
                      debugging your agent — all in the Hummingbot Discord.
                    </p>
                  </div>
                  <Button asChild className="shrink-0">
                    <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
                      Join Discord
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <TableOfContents items={TOC_ITEMS} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
