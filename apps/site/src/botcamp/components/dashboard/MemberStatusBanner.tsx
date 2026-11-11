import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Award, Rocket, CheckCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { cn } from "@/botcamp/lib/utils"

interface BannerHackathon {
  slug: string
  title: string
  /** Hackathon.status — what the card says and links to depends on the stage. */
  stage: string
  registrationOpen: boolean
  registrationOpensOn: string | null
  raceStartsOn: string
}

interface MemberStatusBannerProps {
  isCertified: boolean
  hackathon?: BannerHackathon | null
  hasRegisteredForHackathon?: boolean
}

/** Copy for a visitor who isn't registered, once sign-ups aren't open. */
function closedRegistrationCopy(h: BannerHackathon): {
  title: string
  description: string
  cta: string
  href: string
  badge?: string
} {
  switch (h.stage) {
    case "COMING_SOON":
      return {
        title: h.title,
        badge: "Coming Soon",
        description: `Build AI trading agents with Condor and compete for USDC prizes. Registration opens ${h.registrationOpensOn ?? "soon"}.`,
        cta: "Learn more",
        href: `/hackathons/${h.slug}`,
      }
    case "ACTIVE":
      return {
        title: `${h.title} is live`,
        description: "AI trading agents are racing with real capital right now. Follow the standings.",
        cta: "Watch the race",
        href: `/hackathons/${h.slug}#leaderboard`,
      }
    case "COMPLETED":
      return {
        title: `${h.title}: the results are in`,
        description: "See the winning AI trading agents and how the whole field finished.",
        cta: "See the winners",
        href: `/hackathons/${h.slug}#winners`,
      }
    case "JUDGING":
      return {
        title: `${h.title}: results coming soon`,
        description: "The race is over. See the provisional standings while official results are finalized.",
        cta: "See the standings",
        href: `/hackathons/${h.slug}#leaderboard`,
      }
    default:
      return {
        title: `${h.title} starts ${h.raceStartsOn}`,
        description: "Registration is closed. Watch the AI trading agents race live on the leaderboard.",
        cta: "View hackathon",
        href: `/hackathons/${h.slug}`,
      }
  }
}

/** Copy for a registered builder, by stage. */
function registeredCopy(h: BannerHackathon): { title: string; description: string } {
  switch (h.stage) {
    case "COUNTDOWN":
      return {
        title: `The race starts ${h.raceStartsOn}`,
        description: "Applications are closed. Your hub shows whether you're racing and what's next.",
      }
    case "ACTIVE":
      return {
        title: `${h.title} is live`,
        description: "The race is running. Follow the standings and your race status in the hub.",
      }
    case "JUDGING":
      return {
        title: "Race finished — results coming soon",
        description: "Your hub shows where you finished on the provisional standings.",
      }
    case "COMPLETED":
      return {
        title: `${h.title}: the results are in`,
        description: "Your hub shows your official result and the winners.",
      }
    default:
      return {
        title: `You're registered for ${h.title}`,
        description: "Videos, guides, connector docs, and real examples to help you build your agent.",
      }
  }
}

/**
 * Shared dashboard-card shell so the member/hackathon status reads as part of
 * the same set as the other CTA cards (intro course, complete profile, join
 * community). Each variant keeps its own accent gradient to stay distinct.
 */
function StatusCard({
  icon: Icon,
  title,
  description,
  action,
  gradient,
  border,
  iconBg,
  iconText,
  titleClass,
  badge,
}: {
  icon: LucideIcon
  title: string
  description: string
  action: React.ReactNode
  gradient: string
  border: string
  iconBg: string
  iconText: string
  titleClass?: string
  /** Status chip beside the title, e.g. "Coming Soon". */
  badge?: string
}) {
  return (
    <Card className={cn("bg-gradient-to-br", gradient, border)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bc-md",
              iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", iconText)} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className={titleClass}>{title}</CardTitle>
              {badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" />
                  {badge}
                </span>
              )}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{action}</CardContent>
    </Card>
  )
}

export function MemberStatusBanner({
  isCertified,
  hackathon,
  hasRegisteredForHackathon = false,
}: MemberStatusBannerProps) {
  // Not registered and sign-ups closed — point at the event, not a dead
  // Register link (amber)
  if (hackathon && !hasRegisteredForHackathon && !hackathon.registrationOpen) {
    const copy = closedRegistrationCopy(hackathon)
    return (
      <StatusCard
        icon={Rocket}
        title={copy.title}
        description={copy.description}
        badge={copy.badge}
        gradient="from-amber-500/15 to-transparent"
        border="border-amber-500/30"
        iconBg="bg-amber-500/15"
        iconText="text-amber-500"
        action={
          <Button asChild>
            <Link href={copy.href}>{copy.cta}</Link>
          </Button>
        }
      />
    )
  }

  // Hackathon available but not registered - highest priority CTA (amber)
  if (hackathon && !hasRegisteredForHackathon) {
    return (
      <StatusCard
        icon={Rocket}
        title={hackathon.title}
        description="Build AI trading agents with Condor and compete for USDC prizes in our online hackathon. Open to everyone!"
        gradient="from-amber-500/15 to-transparent"
        border="border-amber-500/30"
        iconBg="bg-amber-500/15"
        iconText="text-amber-500"
        action={
          <Button asChild>
            <Link href={`/hackathons/${hackathon.slug}/register`}>Register</Link>
          </Button>
        }
      />
    )
  }

  // Already registered - confirm and point to Resources, the actionable
  // next step for someone who's already in (emerald)
  if (hackathon && hasRegisteredForHackathon) {
    const copy = registeredCopy(hackathon)
    return (
      <StatusCard
        icon={CheckCircle}
        title={copy.title}
        description={copy.description}
        gradient="from-success/15 to-transparent"
        border="border-success/30"
        iconBg="bg-success/15"
        iconText="text-success"
        titleClass="text-success"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/dashboard/hackathons/${hackathon.slug}`}>Hackathon Hub</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/hackathons/${hackathon.slug}/resources`}>Go to Resources and Rules</Link>
            </Button>
          </div>
        }
      />
    )
  }

  // Certified members - success state (when no active hackathon) (emerald)
  if (isCertified) {
    return (
      <StatusCard
        icon={Award}
        title="Certified Developer"
        description="You've completed a cohort and have a certified strategy. Your profile is visible in the members directory."
        gradient="from-success/15 to-transparent"
        border="border-success/30"
        iconBg="bg-success/15"
        iconText="text-success"
        titleClass="text-success"
        action={
          <Button variant="outline" asChild>
            <Link href="/builders">View Directory</Link>
          </Button>
        }
      />
    )
  }

  // No hackathon and not certified - don't show anything
  return null
}
