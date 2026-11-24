import { cache, type ReactNode } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { prisma } from "@/botcamp/lib/prisma"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"
import { auth } from "@/botcamp/lib/auth"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Button } from "@/botcamp/components/ui/button"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { TeamColorCard } from "@/botcamp/components/hackathons/TeamColorCard"
import { EventSchedule } from "@/botcamp/components/hackathons/EventSchedule"
import { BuildersShowcaseSection } from "@/botcamp/components/hackathons/BuildersShowcaseSection"
import { getRegisteredBuilders } from "@/botcamp/lib/hackathon-data"
import { resolveSessionUrl, sessionDayEnd } from "@/botcamp/lib/hackathon-sessions"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import { VIDEO_IFRAME_SANDBOX, youtubeVideoId } from "@/botcamp/lib/video-embed"
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Bot,
  Cpu,
  Code2,
  PlayCircle,
  BookOpen,
  Scale,
  CalendarClock,
  type LucideIcon,
} from "lucide-react"
import {
  DEFAULT_PRIMARY_COLOR,
  MAX_APPLICATIONS_PER_HACKATHON,
  SQUAD_RULES,
} from "@/botcamp/lib/hackathon-squads"
import {
  findRaceWindow,
  fmtFull,
  getCurrentStageIndex,
  getStagePhases,
  isRegistrationOpen,
  openSeatCopy,
} from "@/botcamp/lib/hackathon-stages"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string; teamSlug: string }>
}

const getData = cache(async (slug: string, teamSlug: string) => {
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      teamIds: true,
      maxSelections: true,
      registrationStart: true,
      registrationEnd: true,
      raceStart: true,
      raceEnd: true,
      startDate: true,
      endDate: true,
      sessions: {
        select: { id: true, slug: true, title: true, description: true, date: true, videoId: true, teamId: true },
        orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
      },
    },
  })
  if (!hackathon || hackathon.status === "DRAFT") return null

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      websiteUrl: true,
      rules: true,
      resources: true,
      logoUrl: true,
      logoUrlDark: true,
      primaryColor: true,
    },
  })
  // Team must belong to this hackathon
  if (!team || !hackathon.teamIds.includes(team.id)) return null

  const STRATEGY_SELECT = {
    id: true,
    slug: true,
    title: true,
    tags: true,
    exchanges: true,
    videoURL: true,
    strategyType: true,
    cohortRelation: { select: { number: true } },
    _count: { select: { files: true } },
    authors: {
      select: {
        user: {
          select: { firstName: true, lastName: true, name: true, avatarUrl: true },
        },
      },
    },
  } as const

  // The drivers this team selected — its seats.
  const selected = await prisma.application.findMany({
    where: { hackathonId: hackathon.id, selectedTeamId: team.id },
    select: {
      id: true,
      strategy: { select: STRATEGY_SELECT },
      user: {
        select: { firstName: true, lastName: true, name: true, avatarUrl: true },
      },
    },
  })

  // Continuous racing-number offset across all teams (same scheme as the
  // TeamStartingGrid): team 0 → 01,02; team 1 → 03,04; …; Derive at #5 → 09,10.
  const allTeams = await prisma.team.findMany({
    where: { id: { in: hackathon.teamIds } },
    select: { id: true, slug: true },
    orderBy: { sortOrder: "asc" },
  })
  const teamIndex = allTeams.findIndex((t) => t.id === team.id)
  const slotOffset = (teamIndex < 0 ? 0 : teamIndex) * hackathon.maxSelections

  return { hackathon, team, selected, slotOffset }
})

type StrategyForCard = {
  id: number
  slug: string
  title: string
  tags: string[]
  exchanges: string[]
  videoURL: string | null
  strategyType: "AGENT" | "SCRIPT" | "CONTROLLER" | "V1_STRATEGY" | "OTHER"
  cohortRelation: { number: number } | null
  _count: { files: number }
  authors: {
    user: {
      firstName: string | null
      lastName: string | null
      name: string | null
      avatarUrl: string | null
    }
  }[]
}

type AuthorUser = {
  firstName: string | null
  lastName: string | null
  name: string | null
  avatarUrl: string | null
}

function fullName(u: AuthorUser | null | undefined, fallback = "Anonymous Builder"): string {
  if (!u) return fallback
  const composed = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
  return composed || u.name || fallback
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return { first: "", last: name }
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] }
}

/** Blurbs under the build-hub headings. Deliberately identical for every
 * team — they explain what the section is, while the team-specific substance
 * is the markdown the sponsor supplies below them. */
const SECTION_BLURBS = {
  selectionCriteria: "What this team weighs when choosing which agents take its seats.",
  buildResources: "Docs, SDKs, and agent skills for building on this team's venue.",
} as const

/** One item in the "Build for {team}" hub — neutral card body (for
 * readability of long markdown/lists) with a brand-colored left accent
 * border and icon chip so it still reads as this sponsor's own content. */
function BuildHubCard({
  primaryColor,
  icon: Icon,
  label,
  description,
  children,
}: {
  primaryColor: string
  icon: LucideIcon
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div
      className="rounded-bc-xl border border-border bg-card p-6 md:p-7"
      style={{ borderLeft: `4px solid ${primaryColor}` }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 18%, transparent)` }}
        >
          <Icon className="h-4 w-4" style={{ color: primaryColor }} />
        </span>
        <h3 className="text-xl font-bold">{label}</h3>
      </div>
      {description && (
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">{description}</p>
      )}
      {children}
    </div>
  )
}

/** Sponsor workshop — a build-hub card carrying the recording inline, so the
 * label sits in the same rail as Selection Criteria and Build Resources. The
 * player is embedded rather than linked out: the recording is the content of
 * this card, not a destination elsewhere. Non-YouTube links (Vimeo, Loom)
 * can't be embedded from the stored URL shape, so those keep a plain link. */
function WorkshopCard({
  primaryColor,
  title,
  description,
  videoUrl,
  date,
  isUpcoming,
}: {
  primaryColor: string
  title: string
  description: string | null
  videoUrl: string | null
  date?: Date | string | null
  isUpcoming?: boolean
}) {
  const ytId = videoUrl ? youtubeVideoId(videoUrl) : null
  const dateLabel = date
    ? new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })
    : null

  return (
    <BuildHubCard primaryColor={primaryColor} icon={PlayCircle} label="Watch Workshop">
      {/* Date chip only — the session name is dropped, since "Watch Workshop"
          already heads the card and the description names the team. */}
      {isUpcoming && dateLabel && (
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          <CalendarClock className="h-3 w-3" />
          {dateLabel}
        </span>
      )}
      {description && (
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      )}
      {ytId && (
        <div className="mt-4 aspect-video w-full overflow-hidden rounded-bc-lg bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={title}
            sandbox={VIDEO_IFRAME_SANDBOX}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {videoUrl && !ytId && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          style={{ color: primaryColor }}
        >
          <PlayCircle className="h-4 w-4" />
          {videoUrl.replace(/^https?:\/\//, "")}
        </a>
      )}
    </BuildHubCard>
  )
}

const STRATEGY_TYPE_META: Record<
  StrategyForCard["strategyType"],
  { label: string; icon: typeof Bot }
> = {
  AGENT: { label: "Agent", icon: Bot },
  CONTROLLER: { label: "Controller", icon: Cpu },
  SCRIPT: { label: "Script", icon: Code2 },
  V1_STRATEGY: { label: "V1 Strategy", icon: Code2 },
  OTHER: { label: "Other", icon: Code2 },
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, teamSlug } = await params
  const data = await getData(slug, teamSlug)
  if (!data) return { title: "Team Not Found" }
  const title = `${data.team.name} — ${data.hackathon.title}`
  const description =
    data.team.description?.trim() ||
    `${data.team.name} is fielding two trading agents in the ${data.hackathon.title}. Build your strategy and apply for a seat.`
  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `/hackathons/${data.hackathon.slug}/teams/${data.team.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function TeamPage({ params }: PageProps) {
  // Race clock may have moved the stage since the last render.
  await advanceDueHackathonStages()
  const { slug, teamSlug } = await params
  const session = await auth()
  const data = await getData(slug, teamSlug)
  if (!data) notFound()

  const { hackathon, team, selected, slotOffset } = data

  const userApplicationCount = session?.user?.id
    ? await prisma.application.count({
        where: { hackathonId: hackathon.id, userId: session.user.id },
      })
    : 0
  const userLimitReached = userApplicationCount >= MAX_APPLICATIONS_PER_HACKATHON

  // Registrant showcase + full schedule — these pages double as marketing
  // landing pages, so they mirror the hackathon home.
  const { builders: registrants, total: registrantCount } = await getRegisteredBuilders(
    hackathon.id,
    { take: 40 },
  )
  const eventSessions = hackathon.sessions.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    date: s.date,
    videoUrl: resolveSessionUrl(s.videoId),
  }))

  // Sponsor-specific workshop(s) — admin-linked sessions for this team only.
  // A dated session still counts as "not yet streamed" through the end of
  // its calendar day, even if a (pre-scheduled) live link already exists —
  // same definition EventSchedule/nextSession use for "upcoming".
  const workshopSessions = hackathon.sessions
    .filter((s) => s.teamId === team.id)
    .map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      date: s.date,
      videoUrl: resolveSessionUrl(s.videoId),
      // eslint-disable-next-line react-hooks/purity -- as in Botcamp (its ESLint predates this rule)
      isUpcoming: !!s.date && sessionDayEnd(s.date) > Date.now(),
    }))

  const hasBuildHub =
    workshopSessions.length > 0 || !!team.rules || !!team.resources

  const primary = team.primaryColor || DEFAULT_PRIMARY_COLOR
  // Derive a deeper companion tone from the primary color (used for gradient
  // depth) by mixing toward black. Avoids needing a second DB field.
  const inkMix = `color-mix(in srgb, ${primary} 35%, #000 65%)`

  type Slot =
    | {
        kind: "filled"
        strategy: StrategyForCard
        author: AuthorUser | null
      }
    | { kind: "open" }

  const slots: Slot[] = []
  for (const app of selected) {
    if (slots.length >= hackathon.maxSelections) break
    if (!app.strategy) continue
    slots.push({ kind: "filled", strategy: app.strategy, author: app.user })
  }
  while (slots.length < hackathon.maxSelections) slots.push({ kind: "open" })

  const openCount = slots.filter((s) => s.kind === "open").length
  const filledCount = hackathon.maxSelections - openCount
  const registrationOpen = isRegistrationOpen(hackathon)
  const seatCopy = openSeatCopy(hackathon.status, registrationOpen)
  const stage = hackathon.status
  const isRaceStage = stage === "ACTIVE" || stage === "JUDGING" || stage === "COMPLETED"
  // Before and during sign-ups this section is a build brief; after, it's
  // the brief the racing agents were built against.
  const isBuildPhase = registrationOpen || stage === "COMING_SOON"
  const race = findRaceWindow(hackathon)
  const raceStartLabel = race ? fmtFull(race.start) : "on a date to be announced"
  const whatsNext =
    stage === "ACTIVE"
      ? {
          label: "Racing now",
          lead: `These agents are racing for ${team.name} right now`,
        }
      : stage === "JUDGING" || stage === "COMPLETED"
        ? { label: "The race", lead: `These agents raced for ${team.name}` }
        : {
            label: "What happens next",
            lead: `The trading agents above will represent ${team.name} when the race starts ${raceStartLabel}`,
          }
  const applyOpen = registrationOpen && openCount > 0
  // Registering and applying open together with the Open stage.
  const applicationsOpen = applyOpen
  const applyPath = `/hackathons/${hackathon.slug}/apply?team=${team.id}`
  const applyHref = session?.user
    ? applyPath
    : `/signin?callbackUrl=${encodeURIComponent(applyPath)}`
  const registerPath = `/hackathons/${hackathon.slug}/register`
  const registerHref = session?.user
    ? registerPath
    : `/signin?callbackUrl=${encodeURIComponent(registerPath)}`

  // Hero panel is themed inline (TeamColorCard is for content cards, not the
  // full-bleed hero).
  const heroBackground = {
    background: `linear-gradient(135deg, ${primary} 0%, ${inkMix} 100%)`,
  }
  const halftoneOverlay = {
    backgroundImage:
      "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1.4px)",
    backgroundSize: "10px 10px",
  }

  // Key Dates timeline — mirrors the hackathon page so participants see the
  // same race stages on the team detail surface.
  const stageDates = hackathon
  const TIMELINE_PHASES = getStagePhases(stageDates)
  const currentPhase = getCurrentStageIndex(stageDates)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Top bar with back link */}
        <div className="w-full border-b border-border bg-background">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl py-4">
            <Link
              href={`/hackathons/${hackathon.slug}#teams`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Teams
            </Link>
          </div>
        </div>

        {/* F1-style hero: full-bleed team-color panel */}
        <section className="relative w-full overflow-hidden" style={heroBackground}>
          {/* Halftone dot overlay */}
          <div className="absolute inset-0 opacity-60" style={halftoneOverlay} />
          {/* Soft vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-transparent to-black/30" />

          <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10 py-16 md:py-24">
            <div className="flex flex-col items-center text-center">
              {/* Eyebrow */}
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/90 mb-6">
                {team.name} Build Hub
              </p>

              {/* Logo */}
              <TeamLogoBadge
                logoUrl={team.logoUrl}
                logoUrlDark={team.logoUrlDark}
                alt={team.name}
                className="w-24 h-24 md:w-28 md:h-28 rounded-2xl mb-7"
                imageSize={72}
                iconClassName="h-10 w-10"
              />

              {/* Team name */}
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-bc-tight text-white whitespace-nowrap mb-5">
                {team.name}
              </h1>

              {/* Description */}
              {team.description && (
                <p className="text-white/90 text-base md:text-lg leading-relaxed max-w-2xl mb-5">
                  {team.description}
                </p>
              )}

              {/* Agent names rail */}
              {filledCount > 0 && (
                <div className="flex items-center gap-3 text-white/90 font-medium text-base md:text-lg mb-3">
                  {slots
                    .filter((s): s is Extract<Slot, { kind: "filled" }> => s.kind === "filled")
                    .map((slot, i, arr) => (
                      <span key={i} className="flex items-center gap-3">
                        <span>{fullName(slot.author)}</span>
                        {i < arr.length - 1 && (
                          <span className="text-white/40">|</span>
                        )}
                      </span>
                    ))}
                </div>
              )}

              {/* Website */}
              {team.websiteUrl && (
                <a
                  href={team.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-white/80 hover:text-white transition-colors mt-2"
                >
                  {team.websiteUrl.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Selected agents — the team's roster for the race leads the page,
            right under the hero, now that selections are final. */}
        <section className="container mx-auto px-4 md:px-6 max-w-6xl pt-12 md:pt-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl mb-3">
              Selected Agents
            </h2>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.14em]">
              {filledCount} / {hackathon.maxSelections} Slots Filled
            </p>
          </div>

          {/* Agent cards — F1 driver-card horizontal layout. Tighter bottom
              margin when "What happens next" follows immediately, so that
              caption reads as attached to the grid rather than a floating
              block. */}
          <div className={`grid md:grid-cols-2 gap-5 ${openCount === 0 ? "mb-4" : "mb-14"}`}>
            {slots.map((slot, i) => {
              const slotNumber = String(slotOffset + i + 1).padStart(2, "0")

              if (slot.kind === "open") {
                return (
                  <div
                    key={i}
                    className="relative rounded-bc-xl border border-dashed border-border bg-card/40 p-6 md:p-7 flex flex-col gap-5 min-h-[200px]"
                  >
                    <span className="font-mono text-5xl md:text-6xl font-black text-muted-foreground/30 leading-none">
                      {slotNumber}
                    </span>
                    <div className="flex-1 flex flex-col">
                      <p className="font-bold text-xl text-foreground/80 mb-1">{seatCopy.label}</p>
                      <p className="text-sm text-muted-foreground">{seatCopy.desc}</p>
                    </div>
                  </div>
                )
              }

              const { strategy, author } = slot
              const authorName = fullName(author)
              const { first, last } = splitName(authorName)
              const typeMeta = STRATEGY_TYPE_META[strategy.strategyType]
              const TypeIcon = typeMeta.icon
              const hasVideo = !!strategy.videoURL

              return (
                <TeamColorCard
                  key={i}
                  primaryColor={primary}
                  href={`/hub/${strategy.slug}`}
                  className="min-h-[200px]"
                  contentClassName="p-5 md:p-6 flex h-full gap-4"
                >
                  {/* Diagonal speed-streak (decoration; sits above halftone, below content) */}
                  <div
                    className="absolute inset-y-0 right-0 w-1/2 opacity-30 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
                    }}
                  />

                  {/* Left: agent label + author name + strategy */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 mb-1">
                      Agent {slotNumber}
                    </p>
                    <h3 className="text-white leading-[1.05] mb-1">
                      {first && (
                        <span className="block text-xl md:text-2xl font-medium text-white/90">
                          {first}
                        </span>
                      )}
                      <span className="block text-2xl md:text-3xl font-black uppercase tracking-bc-tight truncate">
                        {last}
                      </span>
                    </h3>
                    <p className="text-white/85 font-medium text-sm md:text-base truncate mb-3">
                      {strategy.title}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/30 backdrop-blur-xs border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white">
                        <TypeIcon className="h-3 w-3" />
                        {typeMeta.label}
                      </span>
                      {strategy.cohortRelation?.number && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/30 backdrop-blur-xs border border-white/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-white">
                          Cohort {strategy.cohortRelation.number}
                        </span>
                      )}
                      {hasVideo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/30 backdrop-blur-xs border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white">
                          <PlayCircle className="h-3 w-3" />
                          Video
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: big slot number + avatar */}
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <span
                      className="font-mono text-5xl md:text-6xl font-black leading-none text-white/95"
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
                    >
                      {slotNumber}
                    </span>
                    <div className="mt-3">
                      {author?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={author.avatarUrl}
                          alt={authorName}
                          className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-white/40"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-white/40 flex items-center justify-center text-xl font-black text-black"
                          style={getAvatarGradient(authorName)}
                        >
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </TeamColorCard>
              )
            })}
          </div>

          {/* What happens next — for fully-staffed teams, and for every team
              once the race is on (rosters are final then). */}
          {(openCount === 0 || isRaceStage) && (
            <div className="rounded-bc-xl border border-border bg-card/40 p-5 md:p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {whatsNext.label}
              </p>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                {whatsNext.lead}, each with {SQUAD_RULES.startingCapitalAmount} in starting capital,
                scored on Volume, P&amp;L, and HBOT Vote — combined performance determines{" "}
                <span className="text-foreground font-semibold">{team.name}</span>&apos;s standing in the{" "}
                {hackathon.title}.
              </p>
              {isRaceStage && (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={`/hackathons/${hackathon.slug}#leaderboard`}>
                    {stage === "ACTIVE" ? "Follow the standings" : "See the standings"}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Build for {team.name} — everything a builder needs for this
            sponsor specifically, consolidated in one place: workshop
            recording, selection criteria, reference agents, and docs.
            Tinted with the team's brand color (wash background + accent
            borders/icon chips) so it reads as this sponsor's own hub
            rather than a generic hackathon-wide section. */}
        {hasBuildHub && (
          <div className="container mx-auto px-4 md:px-6 max-w-6xl py-12 md:py-16">
            <div
              className="relative overflow-hidden rounded-3xl px-4 py-12 md:px-10 md:py-16"
              style={{
                background: `radial-gradient(ellipse 100% 60% at 50% 0%, color-mix(in srgb, ${primary} 16%, transparent) 0%, transparent 70%)`,
              }}
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl mb-3">
                  {isBuildPhase ? "Build for " : "The Brief for "}
                  <span style={{ color: primary }}>{team.name}</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {isBuildPhase
                    ? "Everything you need to build a winning entry for this team, in one place."
                    : "The criteria and resources this team's agents were built against."}
                </p>
              </div>

              <div className="space-y-bc-6 max-w-3xl mx-auto">
                {team.rules && (
                  <BuildHubCard
                    primaryColor={primary}
                    icon={Scale}
                    label="Selection Criteria"
                    description={SECTION_BLURBS.selectionCriteria}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownContent content={team.rules} />
                    </div>
                  </BuildHubCard>
                )}

                {workshopSessions.map((s) => (
                  <WorkshopCard
                    key={s.id}
                    primaryColor={primary}
                    title={s.title}
                    description={s.description}
                    videoUrl={s.videoUrl}
                    date={s.date}
                    isUpcoming={s.isUpcoming}
                  />
                ))}


                {team.resources && (
                  <BuildHubCard
                    primaryColor={primary}
                    icon={BookOpen}
                    label="Build Resources"
                    description={SECTION_BLURBS.buildResources}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownContent content={team.resources} />
                    </div>
                  </BuildHubCard>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Key Dates — full-width section (matches hackathon page), themed
            to this sponsor's brand color instead of the default orange. */}
        <EventSchedule
          sessions={eventSessions}
          phases={TIMELINE_PHASES}
          currentPhase={currentPhase}
          accentColor={primary}
        />

        <div className="container mx-auto px-4 md:px-6 max-w-6xl py-12 md:py-16">
          {/* Everyone else registered for this hackathon — the wider field
              the selected agents above were drawn from. */}
          <BuildersShowcaseSection
            builders={registrants}
            count={registrantCount}
            viewAllHref={`/hackathons/${hackathon.slug}/builders`}
            emptyMessage={
              registrationOpen
                ? "Be the first wave — register and tell teams what you're building."
                : "No builders registered for this hackathon."
            }
          />

          {/* CTA */}
          {applyOpen && (
            <TeamColorCard
              primaryColor={primary}
              className="mt-14"
              contentClassName="p-8 md:p-10 text-center"
            >
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/85 mb-3">
                {applicationsOpen ? "Recruiting Now" : "Build Phase Soon"}
              </p>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-bc-tight text-white mb-3">
                Race for {team.name}
              </h2>
              <p className="text-white/85 mb-6 max-w-xl mx-auto">
                {applicationsOpen && userLimitReached
                  ? `You've reached the limit of ${MAX_APPLICATIONS_PER_HACKATHON} agents submitted for this hackathon.`
                  : "Build your strategy and apply to fill an open seat."}
              </p>
              {applicationsOpen && userLimitReached ? (
                <Button size="lg" variant="secondary" disabled>
                  Application Limit Reached
                </Button>
              ) : (
                <Button size="lg" variant="secondary" asChild>
                  {applicationsOpen ? (
                    <Link href={applyHref}>
                      Apply to Race for {team.name}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  ) : (
                    <Link href={registerHref}>
                      Register For Hackathon
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  )}
                </Button>
              )}
            </TeamColorCard>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
