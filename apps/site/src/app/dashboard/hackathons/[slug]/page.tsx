import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { findRaceWindow, isRegistrationOpen, raceDurationHours, STAGE_LABELS } from "@/botcamp/lib/hackathon-stages"
import { auth } from "@/botcamp/lib/preview-session"
import { Button } from "@/botcamp/components/ui/button"
import { eyebrow } from "@/botcamp/lib/design-constants"
import { getHackathonSquads, getRegisteredBuilders } from "@/botcamp/lib/hackathon-data"
import { HubPanel } from "@/botcamp/components/hackathons/HubPanel"
import { HubCalendar, type HubSession } from "@/botcamp/components/hackathons/HubCalendar"
import { CompactHackathonCountdown } from "@/botcamp/components/hackathons/HackathonCountdown"
import { resolveSessionUrl } from "@/botcamp/lib/hackathon-sessions"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { TeamColorCard } from "@/botcamp/components/hackathons/TeamColorCard"
import { TeamAgentSeats } from "@/botcamp/components/hackathons/TeamSponsorsGrid"
import { TeamStartingGrid } from "@/botcamp/components/hackathons/TeamStartingGrid"
import { LeaderboardTable } from "@/botcamp/components/hackathons/LeaderboardTable"
import { loadRaceLeaderboard } from "@/botcamp/lib/hackathon-race-view"
import { DEFAULT_PRIMARY_COLOR, SQUAD_RULES } from "@/botcamp/lib/hackathon-squads"
import { BuildersShowcaseSection } from "@/botcamp/components/hackathons/BuildersShowcaseSection"
import { RegistrationProfileCard } from "@/botcamp/components/hackathons/RegistrationProfileCard"
import { MyApplicationsPanel, type HubApplication } from "@/botcamp/components/hackathons/MyApplicationsPanel"
import { StrategySeatBadge } from "@/botcamp/components/strategies/StrategySeatBadge"
import { getSeatTeams } from "@/botcamp/lib/strategy-edit"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import { EditableAgentIdea } from "@/botcamp/components/hackathons/EditableAgentIdea"
import { HubRaceCountdown } from "@/botcamp/components/hackathons/HubRaceCountdown"
import { HubFinalResult, type HubFinalResultProps } from "@/botcamp/components/hackathons/HubFinalResult"
import { HONORABLE_MENTION_PRIZE, HONORABLE_MENTIONS, podiumPrizes } from "@/botcamp/lib/hackathon-leaderboard"
import {
  Rocket,
  CalendarDays,
  Users,
  CheckCircle2,
  ArrowRight,
  Trophy,
  ListOrdered,
  BookOpen,
  MessageCircle,
  Lock,
  Flag,
} from "lucide-react"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

const DISCORD_URL = "https://discord.gg/hummingbot"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ discord?: string }>
}

function fmtRaceStart(date: Date): string {
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
  return `${day} at ${time} UTC`
}

/** Hub header subtitle — what a builder should be doing in this stage. */
function hubSubtitle(stage: string, isRegistered: boolean, title: string, raceStartsOn: string): string {
  if (!isRegistered) {
    switch (stage) {
      case "COMING_SOON":
        return `Your home base for ${title}. Registration opens soon.`
      case "REGISTRATION":
        return `Your home base for ${title}. Register to claim your grid spot.`
      case "COUNTDOWN":
        return `Registration is closed. The race starts ${raceStartsOn}.`
      case "ACTIVE":
        return "Registration is closed. The race is live — follow it on the leaderboard."
      case "COMPLETED":
        return "Official results are in. See the winners and how the field finished."
      default:
        return "The race is over. See how it finished on the leaderboard."
    }
  }
  switch (stage) {
    case "COMING_SOON":
    case "REGISTRATION":
      return "You're on the grid. Design your strategy, track the schedule, and apply to a team."
    case "COUNTDOWN":
      return `Applications are closed and the race starts ${raceStartsOn}. Keep refining until the start.`
    case "ACTIVE":
      return "The race is live. Your agent's code is frozen — follow the standings."
    case "COMPLETED":
      return "Official results are in. Thanks for building and racing."
    default:
      return "The race is over. Results are on the leaderboard."
  }
}

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? "th"}`

const usdCompactShare = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

/**
 * What a racer shares once the race is over: the place they finished against
 * the field, with their best number — P&L when it's positive, else volume. With
 * no standings yet, just that they raced. Judging results are provisional.
 */
function racerShareText(opts: {
  place: number | null
  fieldSize: number
  team: string
  edition: string
  hours: number
  pnlPercent: number | null
  volumeQuote: number | null
  honorableMention?: boolean
  final: boolean
}): string {
  const { place, fieldSize, team, edition, hours, pnlPercent, volumeQuote, honorableMention = false, final } = opts
  const capital = SQUAD_RULES.startingCapitalAmount
  const results = `${honorableMention ? "🎖️ Plus an honorable mention. " : ""}${final ? "Final standings:" : "Results are being finalized:"}`
  const stat =
    pnlPercent !== null && pnlPercent > 0
      ? ` +${pnlPercent.toFixed(2)}% on ${capital} of real capital.`
      : volumeQuote
        ? ` ${usdCompactShare.format(volumeQuote)} traded in ${hours} hours.`
        : ""
  if (place === null) {
    return `🏁 ${hours} hours of live trading with real capital — my AI trading agent raced for ${team} at the ${edition}. ${results}`
  }
  if (place === 1) {
    return `🏆 I won the ${edition}! My AI trading agent beat ${fieldSize - 1} others racing for ${team}.${stat} ${results}`
  }
  if (place <= 3) {
    return `${place === 2 ? "🥈" : "🥉"} Podium! My AI trading agent finished ${ordinal(place)} of ${fieldSize} at the ${edition}, racing for ${team}.${stat} ${results}`
  }
  return `🏁 ${fieldSize} AI trading agents, ${hours} hours, ${capital} of real capital each. Mine crossed the line P${place} for ${team} at the ${edition}.${stat} ${results}`
}

function fmtShort(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

/** Short plain-text teaser of a team's rules markdown for the compact Teams
 * tab card — the full criteria (plus workshop, examples, and resources) live
 * on the team's own page now, so this card only needs a hint. */
function criteriaTeaser(markdown: string | null | undefined): string | null {
  if (!markdown) return null
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^>\s?/gm, "") // blockquotes
    .replace(/^[-*+]\s+/gm, "") // list bullets
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return null
  return plain.length > 140 ? `${plain.slice(0, 140).trimEnd()}…` : plain
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await prisma.hackathon.findUnique({ where: { slug }, select: { title: true } })
  return { title: hackathon ? hackathon.title : "Hackathon" }
}

export default async function HackathonHubPage({ params, searchParams }: PageProps) {
  // Botcamp advances the hackathon stage here (advanceDueHackathonStages, a
  // database write). The read-only preview shows the stage last saved.
  const { slug } = await params
  const { discord: discordFeedback } = await searchParams
  const session = await auth()
  if (!session?.user?.id) {
    notFound()
  }
  const userId = session.user.id

  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      startDate: true,
      registrationStart: true,
      registrationEnd: true,
      raceStart: true,
      raceEnd: true,
      teamIds: true,
      maxSelections: true,
      sessions: {
        select: { id: true, slug: true, title: true, description: true, date: true, videoId: true },
        orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
      },
    },
  })
  if (!hackathon || hackathon.status === "DRAFT") {
    notFound()
  }

  const [
    entry,
    profile,
    teams,
    buildersResult,
    teamCriteria,
    eligibleStrategyCount,
    ownStrategies,
  ] = await Promise.all([
    prisma.hackathonEntry.findUnique({
      where: { hackathonId_userId: { hackathonId: hackathon.id, userId } },
      select: { strategyDescription: true, sponsorTeamId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        tagline: true,
        location: true,
        avatarUrl: true,
        discordId: true,
      },
    }),
    getHackathonSquads(hackathon.id, hackathon.teamIds, hackathon.maxSelections),
    getRegisteredBuilders(hackathon.id, { excludeUserId: userId, take: 40 }),
    // Teams tab — each sponsor's selection criteria (Team.rules markdown).
    prisma.team.findMany({
      where: { id: { in: hackathon.teamIds } },
      select: { id: true, rules: true },
    }),
    // Step highlighting — has the builder created a strategy yet?
    prisma.strategy.count({
      where: {
        authors: { some: { userId } },
      },
    }),
    // Seat callout — which of the builder's strategies hold a squad seat.
    prisma.strategy.findMany({
      where: { authors: { some: { userId } } },
      select: { id: true, slug: true, title: true },
    }),
  ])

  // Null until Race Start or the finals session is set.
  const finals = findRaceWindow(hackathon)
  // The leaderboard joins the hub once the race is on.
  const raceStage =
    hackathon.status === "ACTIVE" || hackathon.status === "JUDGING" || hackathon.status === "COMPLETED"
  const raceView = finals && raceStage ? await loadRaceLeaderboard(hackathon.id, finals) : null

  const seatTeams = await getSeatTeams(ownStrategies.map((s) => s.id))
  const seatedStrategies = ownStrategies
    .filter((s) => seatTeams.has(s.id))
    .map((s) => ({ ...s, teamName: seatTeams.get(s.id)! }))
  const beforeCodeFreeze = !finals || new Date() < finals.codeFreeze

  const rulesByTeamId = new Map(teamCriteria.map((t) => [t.id, t.rules]))

  const showcase = buildersResult.builders
  const othersCount = buildersResult.total

  const isRegistered = !!entry
  const now = new Date()
  const applicationsOpen = isRegistrationOpen(hackathon, now)
  const raceStartsOn = finals ? fmtRaceStart(finals.start) : "on a date to be announced"
  const stageLabel = STAGE_LABELS[hackathon.status]

  const applicationDeadline = hackathon.registrationEnd
    ? fmtShort(hackathon.registrationEnd.toISOString())
    : null

  const sessions: HubSession[] = hackathon.sessions.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    date: s.date ? s.date.toISOString() : null,
    videoUrl: resolveSessionUrl(s.videoId),
  }))

  // Applications panel (registered + apply window). Resolve team-pref IDs to names.
  let applications: HubApplication[] = []
  let selectedTeamId: string | null = null
  let selectedStrategyId: number | null = null
  let selectedStrategySlug: string | null = null
  if (isRegistered) {
    const teamNameById = new Map(teams.map((t) => [t.id, t.name]))
    const apps = await prisma.application.findMany({
      where: { hackathonId: hackathon.id, userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        teamPreferences: true,
        strategyId: true,
        selectedTeamId: true,
        strategy: { select: { title: true, slug: true } },
        selectedTeam: { select: { name: true } },
      },
    })
    const selectedApp = apps.find((a) => a.selectedTeamId)
    selectedTeamId = selectedApp?.selectedTeamId ?? null
    selectedStrategyId = selectedApp?.strategyId ?? null
    selectedStrategySlug = selectedApp?.strategy?.slug ?? null
    applications = apps.map((a) => ({
      id: a.id,
      status: a.status,
      strategyId: a.strategyId,
      strategyTitle: a.strategy?.title ?? null,
      teamPreferenceNames: a.teamPreferences
        .map((id) => teamNameById.get(id))
        .filter((n): n is string => !!n),
      selectedTeamName: a.selectedTeam?.name ?? null,
    }))
  }

  const racingTeam = selectedTeamId ? teams.find((t) => t.id === selectedTeamId) ?? null : null
  const hasSubmitted = applications.some((a) => a.status !== "DRAFT")
  const shareDate = finals ? fmtShort(finals.start.toISOString()) : "soon"
  const hubTeam = racingTeam
    ? {
        name: racingTeam.name,
        primaryColor: racingTeam.primaryColor || DEFAULT_PRIMARY_COLOR,
        logoUrl: racingTeam.logoUrl,
        logoUrlDark: racingTeam.logoUrlDark,
      }
    : null
  const sharePath = `/hackathons/${hackathon.slug}`

  // Live numbers for the hub — only once the race is running, and only from
  // real RaceAgents (never the sample field).
  // Judging reads the standings frozen at raceEnd (provisional until results are saved).
  const isPostRace = hackathon.status === "JUDGING" || hackathon.status === "COMPLETED"
  const isFinal = hackathon.status === "COMPLETED"
  const liveBoard = raceView?.leaderboard ?? null
  // Positions mean nothing until an agent has reported: with no readings the
  // whole field sits at zero, tied for first.
  const hasLiveBoard = !!liveBoard && liveBoard.agents.some((a) => a.reporting)
  const myAgent = hasLiveBoard && selectedStrategySlug
    ? liveBoard.agents.find((a) => a.slug === selectedStrategySlug) ?? null
    : null
  const teamColorById = new Map(teams.map((t) => [t.id, t.primaryColor || DEFAULT_PRIMARY_COLOR]))
  // A racing builder always sees their numbers row — dashes until their bot
  // is registered and has reported.
  const yourStanding =
    (hackathon.status === "ACTIVE" || isPostRace) && racingTeam
      ? {
          rank: myAgent?.rank ?? null,
          of: liveBoard?.agents.length ?? 0,
          pnlPercent: myAgent?.metrics ? myAgent.pnlPercent : null,
          volumeQuote: myAgent?.metrics?.volumeQuote ?? null,
          href: myAgent ? `${sharePath}/agents/${myAgent.slug}` : null,
        }
      : null
  // Live: the top 5, for spectators. After the race: the top 3 for everyone,
  // plus the builder's own agent below them if it finished further back.
  const boardRows = hasLiveBoard ? liveBoard.agents.map((a, i) => ({ agent: a, position: i + 1 })) : []
  const shownRows = isPostRace
    ? [
        ...boardRows.slice(0, 3),
        ...boardRows.filter((r) => r.position > 3 && r.agent.agentId === myAgent?.agentId),
      ]
    : racingTeam
      ? []
      : boardRows.slice(0, 5)
  const topStandings = shownRows.length > 0
    ? shownRows.map(({ agent: a, position }) => ({
        position,
        isYou: a.agentId === myAgent?.agentId,
        rank: a.rank,
        title: a.strategyTitle,
        driver: a.driver?.name ?? null,
        color: teamColorById.get(a.teamId) ?? DEFAULT_PRIMARY_COLOR,
        pnlPercent: a.pnlPercent,
        href: `${sharePath}/agents/${a.slug}`,
      }))
    : undefined
  // The headline of the hub while the race is next or running: in the team's
  // colors for a selected builder, a spectator version for everyone else.
  const raceCountdown = !finals
    ? null
    : hackathon.status === "COUNTDOWN"
      ? racingTeam
        ? {
            target: finals.start.toISOString(),
            label: "Race starts in",
            reachedLabel: "Race starting · stand by",
            headline: "Get Ready — It's About to Start",
            targetLabel: raceStartsOn,
            detail: `Your agent goes live with ${SQUAD_RULES.startingCapitalAmount} of real capital. Make these last moves count.`,
            team: hubTeam,
            checklist: [
              {
                text: beforeCodeFreeze
                  ? `Code and strategy.md freeze ${fmtShort(finals.codeFreeze.toISOString())}, 00:00 UTC — ship your final changes now.`
                  : "Code and strategy.md are frozen for the race.",
              },
              {
                text: "Join #hackathon-builders on Discord for race-day updates.",
                action: profile?.discordId
                  ? { label: "Open Discord", href: DISCORD_URL, external: true }
                  : // Same OAuth flow as the Resources tab's "Unlock Channel", in a new
                    // tab so the hub stays open.
                    {
                      label: "Join on Discord",
                      href: `/api/discord/authorize?hackathon=${hackathon.slug}`,
                      external: true,
                    },
              },
              { text: "Tell people you're racing — share your entry below." },
            ],
            primaryCta: selectedStrategyId
              ? { label: "Refine your strategy", href: `/dashboard/strategies/${selectedStrategyId}` }
              : { label: "View the starting grid", href: `${sharePath}#teams` },
            secondaryCta: selectedStrategyId
              ? { label: "View the starting grid", href: `${sharePath}#teams` }
              : undefined,
            share: {
              label: "Tell people you're racing",
              text: `I'm racing for ${racingTeam.name} in the ${hackathon.title}! My AI trading agent goes live ${shareDate} with real capital. Follow the race:`,
              path: sharePath,
            },
          }
        : {
            target: finals.start.toISOString(),
            label: "Race starts in",
            reachedLabel: "Race starting · stand by",
            headline: "The Grid Is Set",
            targetLabel: raceStartsOn,
            detail: hasSubmitted
              ? "Your agent wasn't picked this time — but race day is where the learning is. Watch every agent trade real capital live, see what the top strategies do, and come back stronger next edition."
              : "Every seat is filled. Watch the agents trade real capital live, and see which strategies come out on top.",
            primaryCta: { label: "Explore the starting grid", href: `${sharePath}#teams` },
            secondaryCta: { label: "Meet the teams", href: `${sharePath}/teams` },
            share: {
              label: "Spread the word",
              text: `The ${hackathon.title} starts ${shareDate} — AI trading agents racing with real capital. Watch it live:`,
              path: sharePath,
            },
          }
      : hackathon.status === "ACTIVE"
        ? {
            target: finals.end.toISOString(),
            raceClock: { start: finals.start.toISOString(), end: finals.end.toISOString() },
            label: "Race live",
            reachedLabel: "Race finished · results coming",
            headline: racingTeam ? "You're Live" : "The Race Is Live",
            targetLabel: `Ends ${fmtRaceStart(finals.end)}`,
            detail: racingTeam
              ? "Your agent is trading. Follow its standing on the leaderboard."
              : "Follow the standings on the leaderboard.",
            team: hubTeam,
            yourStanding,
            topStandings,
            primaryCta: { label: racingTeam ? "Full leaderboard" : "Watch the leaderboard", href: `${sharePath}#leaderboard` },
            share: {
              label: racingTeam ? "Tell people you're racing" : "Spread the word",
              text: racingTeam
                ? `My AI trading agent is live in the ${hackathon.title}, racing for ${racingTeam.name}. Follow the race:`
                : `The ${hackathon.title} is live — AI trading agents racing with real capital. Watch:`,
              path: sharePath,
            },
          }
        : isPostRace
          ? {
              label: isFinal ? "Results announced" : "Race finished · results being finalized",
              reachedLabel: isFinal ? "Results announced" : "Race finished · results being finalized",
              finished: true,
              headline: racingTeam
                ? myAgent
                  ? `You Finished P${myAgent.rank}`
                  : "You Raced"
                : isFinal
                  ? "The Results Are In"
                  : "The Race Is Over",
              targetLabel: `Ended ${fmtRaceStart(finals.end)}`,
              detail: racingTeam
                ? isFinal
                  ? "That's your official result. Thanks for racing — see how the whole field finished."
                  : "That's your provisional position. Official results — HBOT vote included — are announced once judging wraps up."
                : isFinal
                  ? "Official results are in, HBOT vote included. Here are the winners."
                  : "Official results are being finalized, HBOT vote included. Here's how the provisional standings look.",
              team: hubTeam,
              yourStanding,
              topStandings,
              primaryCta: isFinal
                ? { label: "See the winners", href: `${sharePath}#winners` }
                : { label: "See the standings", href: `${sharePath}#leaderboard` },
              share: {
                label: racingTeam ? "Tell people how it went" : "Spread the word",
                text: racingTeam
                  ? racerShareText({
                      place: myAgent?.rank ?? null,
                      fieldSize: liveBoard?.agents.length ?? 0,
                      team: racingTeam.name,
                      edition: `${hackathon.title} ${finals.end.getUTCFullYear()}`,
                      hours: raceDurationHours(finals),
                      pnlPercent: myAgent?.metrics ? myAgent.pnlPercent : null,
                      volumeQuote: myAgent?.metrics?.volumeQuote ?? null,
                      final: isFinal,
                    })
                  : isFinal
                    ? `The ${hackathon.title} results are in — see the winning AI trading agents:`
                    : `The ${hackathon.title} race is over — see how the AI trading agents finished:`,
                path: sharePath,
              },
            }
        : null

  // Completed + raced: a personal final-result card replaces the race card.
  let finalResult: HubFinalResultProps | null = null
  if (isFinal && racingTeam && myAgent && liveBoard && raceView) {
    const board = liveBoard.agents
    // The place the leaderboard shows — agents that tie share it.
    const position = myAgent.rank
    const fieldSize = board.length
    const pts = (n: number) => `${n.toFixed(2)} pts`
    const leader = board[0]
    // The first agent behind on score (tied agents aren't behind).
    const next = board.find((a) => a.score < myAgent.score)
    const gapLine =
      position === 1
        ? next
          ? `${pts(myAgent.score - next.score)} ahead of ${next.strategyTitle} (#${next.rank}).`
          : null
        : position <= 3
          ? `${pts(leader.score - myAgent.score)} behind the champion${next ? ` · ${pts(myAgent.score - next.score)} ahead of P${next.rank}` : ""}.`
          : `${pts(board[2].score - myAgent.score)} from the podium.`

    const rankOf = (key: string) => myAgent.breakdown.find((c) => c.key === key)?.rank ?? fieldSize
    const pnlRank = rankOf("pnl")
    const volumeRank = rankOf("volume")
    const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 })

    // Race story from the checkpoints (needs Condor history; skipped without it).
    const highlights: string[] = []
    if (pnlRank === 1) highlights.push("Best P&L in the field")
    else if (volumeRank === 1) highlights.push("Highest volume in the field")
    else highlights.push(pnlRank <= volumeRank ? `${ordinal(pnlRank)} in P&L` : `${ordinal(volumeRank)} in volume`)
    const history = raceView.history.slice(1) // drop the grid
    const midRace = history.filter((cp) => cp.label !== "Final")
    if (midRace.length > 0) {
      const positions = history.map((cp) => ({ label: cp.label, pos: cp.positions[myAgent.agentId] }))
      const led = positions.filter((p) => p.pos === 1).length
      if (led > 0) highlights.push(`Led at ${led} of ${positions.length} checkpoints`)
      const best = positions.reduce((a, b) => (b.pos && b.pos < a.pos ? b : a), positions[0])
      if (position > 1 && best.pos && best.pos < position) highlights.push(`Peaked at #${best.pos} (${best.label})`)
    }
    const myTeamStanding = liveBoard.teams.find((t) => t.teamId === myAgent.teamId)
    if (myTeamStanding) {
      highlights.push(`${racingTeam.name} finished ${ordinal(myTeamStanding.rank)} of ${liveBoard.teams.length} teams`)
    }
    if (position > 3 && position <= Math.ceil(fieldSize / 2)) highlights.push("Top half of the grid")

    const year = raceView.window.end.getUTCFullYear()
    // The same prizes the public leaderboard's Winnings column pays out.
    const podiumPrize = podiumPrizes(board)[myAgent.agentId] ?? 0
    const honorableMention = (HONORABLE_MENTIONS[hackathon.slug] ?? []).includes(myAgent.slug)
    const prize = podiumPrize + (honorableMention ? HONORABLE_MENTION_PRIZE : 0)
    const prizeLabels = [
      podiumPrize > 0 ? `${ordinal(myAgent.rank)} place prize` : null,
      honorableMention ? "Honorable mention" : null,
    ].filter(Boolean)
    finalResult = {
      position,
      fieldSize,
      editionLabel: `${hackathon.title} ${year}`,
      headline:
        position === 1
          ? `You Won the ${hackathon.title}`
          : position <= 3
            ? `You Finished ${ordinal(position)}`
            : `You Finished P${position} of ${fieldSize}`,
      team: hubTeam!,
      prizeAmount: prize > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(prize) : null,
      prizeNote: prizeLabels.length > 0 ? prizeLabels.join(" · ") : null,
      gapLine,
      stats: [
        {
          label: "P&L",
          value: `${myAgent.pnlPercent >= 0 ? "+" : ""}${myAgent.pnlPercent.toFixed(2)}%`,
          sub: `${myAgent.pnlQuote >= 0 ? "+" : "-"}$${Math.abs(myAgent.pnlQuote).toFixed(2)}`,
        },
        { label: "Volume", value: myAgent.metrics ? usd.format(myAgent.metrics.volumeQuote) : "—" },
        { label: "Score", value: myAgent.score.toFixed(2) },
        { label: "P&L rank", value: `${ordinal(pnlRank)}`, sub: `of ${fieldSize}` },
        { label: "Volume rank", value: `${ordinal(volumeRank)}`, sub: `of ${fieldSize}` },
        {
          label: "HBOT vote",
          value: myAgent.teamId in liveBoard.teamVotes ? `${liveBoard.teamVotes[myAgent.teamId]} pts` : "—",
          sub: "team vote points",
        },
      ],
      highlights,
      podium:
        position > 3
          ? board.slice(0, 3).map((a, i) => ({
              position: i + 1,
              title: a.strategyTitle,
              driver: a.driver?.name ?? null,
              color: teamColorById.get(a.teamId) ?? DEFAULT_PRIMARY_COLOR,
              href: `${sharePath}/agents/${a.slug}`,
            }))
          : undefined,
      agentHref: `${sharePath}/agents/${myAgent.slug}`,
      winnersHref: `${sharePath}#winners`,
      strategiesHref: "/dashboard/strategies",
      share: {
        label: "Tell people how it went",
        path: sharePath,
        text: racerShareText({
          place: position,
          fieldSize,
          team: racingTeam.name,
          edition: `${hackathon.title} ${year}`,
          hours: raceDurationHours(raceView.window),
          pnlPercent: myAgent.metrics ? myAgent.pnlPercent : null,
          volumeQuote: myAgent.metrics?.volumeQuote ?? null,
          honorableMention,
          final: true,
        }),
      },
    }
  }

  // The Teams tab helps a builder choose where to apply. From the Countdown on
  // the rosters are final, and the Hub tab's starting grid already shows them.
  const showTeamsTab = hackathon.status === "COMING_SOON" || hackathon.status === "REGISTRATION"

  // Once registration closes an empty pitch is just dead space.
  const showIdeaPanel = isRegistered && (applicationsOpen || !!entry?.strategyDescription?.trim())

  return (
    <div className="space-y-bc-8">
      {/* Header */}
      <div>
        <p className={eyebrow}>Hackathon · {stageLabel}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-bc-tight">{hackathon.title}</h1>
          {isRegistered ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Registered
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Not registered
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          {hubSubtitle(hackathon.status, isRegistered, hackathon.title, raceStartsOn)}
        </p>
      </div>

      {finalResult ? (
        <HubFinalResult {...finalResult} />
      ) : (
        raceCountdown && <HubRaceCountdown {...raceCountdown} />
      )}

      <Tabs defaultValue="hub">
        <TabsList className="mb-4">
          <TabsTrigger value="hub">Hub</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          {showTeamsTab && <TabsTrigger value="teams">Teams</TabsTrigger>}
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* HUB — what you're building, profile, build & apply */}
        <TabsContent value="hub" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-3 auto-rows-min">
        {/* The race card above already shows the seat once the race is next. */}
        {seatedStrategies.length > 0 && !raceCountdown && !finalResult && (
          <HubPanel
            label="Your finals seat"
            icon={Trophy}
            className="lg:col-span-3 border-primary/40"
          >
            <ul className="space-y-bc-3">
              {seatedStrategies.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-bc-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{s.title}</p>
                      <StrategySeatBadge teamName={s.teamName} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {beforeCodeFreeze
                        ? finals
                          ? `You can keep editing your agent until code freezes for the finals (${fmtShort(finals.codeFreeze.toISOString())}, 00:00 UTC).`
                          : "You can keep editing your agent until code freezes, 48 hours before the finals."
                        : "Code is frozen for the finals."}
                    </p>
                  </div>
                  {beforeCodeFreeze && (
                    <Button asChild size="sm">
                      <Link href={`/dashboard/strategies/${s.id}`}>
                        Edit strategy
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </HubPanel>
        )}

        {/* Live standings — the same table as the public hackathon page */}
        {raceView && (
          <HubPanel label="Leaderboard" icon={ListOrdered} className="lg:col-span-3">
            <LeaderboardTable
              leaderboard={raceView.leaderboard}
              history={raceView.history}
              teams={teams}
              hackathonSlug={hackathon.slug}
              raceStart={raceView.window.start.toISOString()}
              raceEnd={raceView.window.end.toISOString()}
            />
          </HubPanel>
        )}

        {/* The starting grid — the same team cards as the public hackathon page */}
        {teams.length > 0 && (
          <HubPanel label="The Starting Grid" icon={Flag} className="lg:col-span-3">
            <TeamStartingGrid
              teams={teams}
              hackathonSlug={hackathon.slug}
              slotsPerSquad={hackathon.maxSelections}
            />
          </HubPanel>
        )}

        {/* Build pitch (registered) OR register explainer (unregistered) */}
        {showIdeaPanel ? (
          <HubPanel label="What you're building" icon={Rocket} className="lg:col-span-2">
            <EditableAgentIdea
              hackathonSlug={hackathon.slug}
              initialDescription={entry?.strategyDescription ?? ""}
              locked={!applicationsOpen}
            />
          </HubPanel>
        ) : isRegistered ? null : applicationsOpen ? (
          <HubPanel label="Get started" icon={Rocket} className="lg:col-span-3">
            <div className="space-y-bc-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Register to tell teams what you&apos;re building and appear in the
                builder showcase. Then build your AI trading agent in Condor and
                apply to the teams you want to race for.
              </p>
              <Button asChild>
                <Link href={`/hackathons/${hackathon.slug}/register`}>
                  Register for {hackathon.title}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </HubPanel>
        ) : (
          <HubPanel
            label={hackathon.status === "COMING_SOON" ? "Coming soon" : "Registration closed"}
            icon={Lock}
            className="lg:col-span-3"
          >
            <div className="space-y-bc-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {hackathon.status === "COMING_SOON"
                  ? hackathon.registrationStart
                    ? `Registration opens ${fmtShort(hackathon.registrationStart.toISOString())}. Meanwhile, check out the teams and the schedule.`
                    : "Registration opens soon. Meanwhile, check out the teams and the schedule."
                  : hackathon.status === "COUNTDOWN"
                    ? `Registration for ${hackathon.title} is closed. The race starts ${raceStartsOn} — follow it live.`
                    : `Registration for ${hackathon.title} is closed. Follow the race on the leaderboard.`}
              </p>
              <Button asChild variant="outline">
                <Link href={`/hackathons/${hackathon.slug}`}>
                  View {hackathon.title}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </HubPanel>
        )}

        {/* Registered-only panels */}
        {isRegistered && profile && (
          <HubPanel label="Your builder profile" icon={Users} className={showIdeaPanel ? "lg:col-span-1" : "lg:col-span-1 lg:order-2"}>
            <RegistrationProfileCard
              firstName={profile.firstName}
              lastName={profile.lastName}
              tagline={profile.tagline}
              location={profile.location}
              avatarUrl={profile.avatarUrl}
              hackathonSlug={hackathon.slug}
              sponsorTeamId={entry?.sponsorTeamId ?? null}
              sponsorLocked={!applicationsOpen}
              teams={teams.map((t) => ({
                id: t.id,
                name: t.name,
                logoUrl: t.logoUrl,
                logoUrlDark: t.logoUrlDark,
              }))}
            />
          </HubPanel>
        )}

        {isRegistered && !(raceCountdown && applications.length === 0) && (
          <HubPanel
            label={
              applicationsOpen || hackathon.status === "COMING_SOON"
                ? "Build and Apply"
                : raceCountdown
                  ? "Your Applications"
                  : "Your Race Status"
            }
            icon={Trophy}
            className={showIdeaPanel ? "lg:col-span-3" : "lg:col-span-2 lg:order-1"}
          >
            <MyApplicationsPanel
              hackathonSlug={hackathon.slug}
              applications={applications}
              stage={hackathon.status}
              applicationsOpen={applicationsOpen}
              raceStartsOn={raceStartsOn}
              opensOn={hackathon.registrationStart ? fmtShort(hackathon.registrationStart.toISOString()) : null}
              deadline={applicationDeadline}
              hasStrategy={eligibleStrategyCount > 0}
              hideRaceStatus={!!raceCountdown}
            />
          </HubPanel>
        )}
          </div>
        </TabsContent>

        {/* RESOURCES — rules + discord, then the builder showcase */}
        <TabsContent value="resources" className="mt-0 space-y-bc-8">
      {/* Resources and Rules (+ Discord) — everything a registered builder
          needs once they start building. */}
      {isRegistered && (
        <HubPanel label="Resources and Rules" icon={BookOpen}>
          <p className="text-sm text-muted-foreground mb-4">
            The official rules, plus videos, guides, code examples, and connector docs — everything
            you need to build your agent.
          </p>
          <Button asChild>
            <Link href={`/hackathons/${hackathon.slug}/resources`}>
              Go to Resources and Rules
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          {/* Discord badge — unlocks the private #hackathon-builders channel
              once the builder links their Discord account. */}
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              Discord
            </p>
            {discordFeedback === "error" && (
              <p className="mb-4 rounded-bc-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Something went wrong linking your Discord account. Try again, or reach out in
                Discord support.
              </p>
            )}
            {discordFeedback === "not_member" && (
              <p className="mb-4 rounded-bc-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                Join the Hummingbot Discord first (button below), then click{" "}
                <strong>Unlock Channel</strong> again.
              </p>
            )}
            {discordFeedback === "success" && (
              <p className="mb-4 flex items-center gap-2 rounded-bc-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                You&apos;re in — #hackathon-builders is unlocked on Discord.
              </p>
            )}

            {profile?.discordId ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  You have access to the private <strong>#hackathon-builders</strong> channel.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Verify your registration to get the badge that unlocks the private builders
                  channel on the Hummingbot Discord.
                </p>
                {/* Read-only preview: Botcamp's Discord OAuth (/api/discord/authorize) grants a role. */}
                <ReadOnlyHint className="shrink-0">
                  <Button variant="outline" disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    Unlock Channel
                  </Button>
                </ReadOnlyHint>
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              Not on the server yet?{" "}
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Join the Hummingbot Discord
              </a>
              .
            </p>
          </div>
        </HubPanel>
      )}

      {/* What Others Are Building */}
      <BuildersShowcaseSection
        builders={showcase}
        count={othersCount}
        viewAllHref={`/hackathons/${hackathon.slug}/builders`}
        title="What Others Are Building"
        eyebrowLabel="Registered Agent Builders"
        subtitle={
          othersCount === 0
            ? "No other builders have registered yet — you're early."
            : `${othersCount} other ${othersCount === 1 ? "builder" : "builders"} registered`
        }
        emptyMessage="Builders who register will show up here. Share the hackathon to get the grid filling up."
      />
        </TabsContent>

        {/* CALENDAR — the full schedule */}
        <TabsContent value="calendar" className="mt-0">
          <HubPanel label="Calendar" icon={CalendarDays}>
            {finals && (
              <div className="mb-6 border-b border-border pb-6">
                <CompactHackathonCountdown
                  competitionStart={finals.start.toISOString()}
                  competitionEnd={finals.end.toISOString()}
                />
              </div>
            )}
            <HubCalendar sessions={sessions} />
          </HubPanel>
        </TabsContent>

        {/* TEAMS — each squad's selected agents plus its selection criteria */}
        {showTeamsTab && (
        <TabsContent value="teams" className="mt-0">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Teams haven&apos;t been announced yet.</p>
          ) : (
            <div className="space-y-bc-4">
              <p className="text-sm text-muted-foreground">
                {applicationsOpen
                  ? "What each sponsor team is looking for in the agents it selects. Rank your preferences accordingly when you apply."
                  : "Who each sponsor team is fielding, and what they looked for in their agents."}
              </p>

              <div className="grid gap-4 lg:grid-cols-2">
                {teams.map((team, teamIndex) => (
                  <TeamColorCard
                    key={team.id}
                    primaryColor={team.primaryColor || DEFAULT_PRIMARY_COLOR}
                    contentClassName="p-6 md:p-7 flex flex-col h-full"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <h3 className="min-w-0 truncate text-2xl font-black uppercase tracking-bc-tight text-white">
                        {team.name}
                      </h3>
                      <TeamLogoBadge
                        logoUrl={team.logoUrl}
                        logoUrlDark={team.logoUrlDark}
                        alt={team.name}
                        className="w-14 h-14 rounded-bc-lg shrink-0"
                        imageSize={36}
                        iconClassName="h-6 w-6"
                      />
                    </div>

                    <TeamAgentSeats
                      agents={team.agents}
                      slotOffset={teamIndex * hackathon.maxSelections}
                    />

                    <div className="mt-5 flex-1 border-t border-white/15 pt-4">
                      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                        Selection Criteria
                      </p>
                      <p className="text-sm text-white/70 line-clamp-2">
                        {criteriaTeaser(rulesByTeamId.get(team.id)) ?? "No selection criteria published yet."}
                      </p>
                    </div>

                    <Link
                      href={`/hackathons/${hackathon.slug}/teams/${team.slug}`}
                      className="mt-4 inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-wide text-white/90 transition-colors hover:text-white"
                    >
                      View team page
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </TeamColorCard>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
