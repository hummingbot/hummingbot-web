import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { LeaderboardTable, ScoringTerms } from "@/botcamp/components/hackathons/LeaderboardTable"
import { loadRaceLeaderboard, type RaceLeaderboardView } from "@/botcamp/lib/hackathon-race-view"
import { getHackathonSquads } from "@/botcamp/lib/hackathon-data"
import { VOTE_POINTS_STEP } from "@/botcamp/lib/hackathon-leaderboard"
import { SNAPSHOT_SPACE } from "@/botcamp/lib/snapshot"
import { TeamStartingGrid } from "@/botcamp/components/hackathons/TeamStartingGrid"
import { FAQAccordion } from "@/botcamp/components/hackathons/FAQAccordion"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import {
  ELIGIBLE_EXCHANGES,
  SCORING_CRITERIA,
  SQUAD_RULES,
  totalRankedDrivers,
  agentCountPhrase,
} from "@/botcamp/lib/hackathon-squads"
import {
  getStagePhases,
  fmtFull,
  fmtShort,
  findRaceWindow,
  FINALS_CODE_FREEZE_HOURS,
  FINALS_DURATION_HOURS,
  FINALS_SESSION_SELECT,
  VOTING_DURATION_HOURS,
  VOTING_START,
  isHackathonStatus,
  isRegistrationOpen,
  openSeatCopy,
  raceDurationHours,
  STAGE_LABELS,
} from "@/botcamp/lib/hackathon-stages"
import { HackathonCountdown } from "@/botcamp/components/hackathons/HackathonCountdown"
import { HackathonVoteButton } from "@/botcamp/components/hackathons/HackathonVoteButton"
import { SponsorLogos } from "@/botcamp/components/hackathons/SponsorLogos"
import { ScrollStatement } from "@/botcamp/components/hackathons/ScrollStatement"
import { RaceBackdrop } from "@/botcamp/components/hackathons/RaceBackdrop"
import { RaceMetrics, RaceResults } from "@/botcamp/components/hackathons/RaceResults"
import { RaceHistoryReplay } from "@/botcamp/components/hackathons/RaceHistoryReplay"
import { SectionPager } from "@/botcamp/components/hackathons/SectionPager"
import { getCachedRaceReplay } from "@/botcamp/lib/hackathon-leaderboard-data"
import { EditionYear } from "@/botcamp/components/hackathons/EditionYear"
import { FactCards } from "@/botcamp/components/hackathons/FactCards"
import { PanelTitle } from "@/botcamp/components/hackathons/PanelTitle"
import { OPERATIONS_EMAIL, operationsMailto } from "@/botcamp/lib/operations-email"
import { DEFAULT_FAQ, isFaqItemVisible, parseFaq, renderFaqText } from "@/botcamp/lib/hackathon-faq"

export const dynamic = "force-dynamic"

// The edition this page tells the story of, and the one it points to next.
const SEASON = "Season 1"
const NEXT_SEASON = { name: "Season 2", year: "2027" }
const SPONSOR_TELEGRAM = "https://t.me/botcampcohorts"

// "Oct 9, 02:52": a date and time in UTC, for the vote's close.
const fmtUtcMinute = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(d)

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function getHackathon(slug: string, { allowDraft = false } = {}) {
  // Botcamp advances the stage here when the race clock passes it
  // (advanceDueHackathonStages, a database write). This site only reads, so
  // the page shows the stage Botcamp last saved.
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      registrationStart: true,
      registrationEnd: true,
      startDate: true,
      endDate: true,
      prizes: true,
      teamIds: true,
      maxSelections: true,
      faq: true,
      ...FINALS_SESSION_SELECT,
    },
  })
  if (!hackathon || (hackathon.status === "DRAFT" && !allowDraft)) return null

  const [teams, registrants, submissions] = await Promise.all([
    getHackathonSquads(hackathon.id, hackathon.teamIds, hackathon.maxSelections),
    prisma.hackathonEntry.count({ where: { hackathonId: hackathon.id } }),
    // A finalized application is a submission; reviewing it doesn't unsubmit it.
    prisma.application.count({ where: { hackathonId: hackathon.id, status: { in: ["FINALIZED", "REVIEWED"] } } }),
  ])

  return {
    ...hackathon,
    registrationStart: hackathon.registrationStart?.toISOString() ?? null,
    registrationEnd: hackathon.registrationEnd?.toISOString() ?? null,
    startDate: hackathon.startDate.toISOString(),
    endDate: hackathon.endDate.toISOString(),
    raceStart: hackathon.raceStart?.toISOString() ?? null,
    raceEnd: hackathon.raceEnd?.toISOString() ?? null,
    prizes: hackathon.prizes as Array<{ place: number; amount: string; description?: string }> | null,
    teams,
    registrants,
    submissions,
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await getHackathon(slug)
  if (!hackathon) return { title: "Hackathon Not Found" }
  const description =
    hackathon.description?.trim() ||
    `Build an agentic trading strategy and compete for your team in the ${hackathon.title} — a Constructors-style championship for trading agents.`
  return {
    title: hackathon.title,
    description,
    openGraph: {
      type: "website",
      title: hackathon.title,
      description,
      url: `/hackathons/${hackathon.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: hackathon.title,
      description,
    },
  }
}

export default async function HackathonPage({ params, searchParams }: PageProps) {
  const { slug } = await params

  const query = await searchParams

  // `?previewStage=COUNTDOWN` renders the page as it would look in that stage,
  // for admins only (the admin stage switcher embeds it). Nothing is saved,
  // and it works on a DRAFT hackathon so the first announcement can be checked.
  const requestedStage = query.previewStage
  const isAdminPreview =
    // Admin-only on Botcamp; there are no admins here, so never.
    isHackathonStatus(requestedStage) && requestedStage !== "DRAFT" && false

  const hackathon = await getHackathon(slug, { allowDraft: isAdminPreview })
  if (!hackathon) notFound()
  // Null until Race Start or the finals session is set — the copy says "TBA" then.
  const race = findRaceWindow(hackathon)
  const raceHours = race ? raceDurationHours(race) : FINALS_DURATION_HOURS
  const raceStartLabel = race ? fmtFull(race.start) : "a date to be announced"
  const previewStage =
    isAdminPreview && isHackathonStatus(requestedStage) && requestedStage !== hackathon.status
      ? requestedStage
      : null
  const displayStage = previewStage ?? hackathon.status
  const displayRegistrationOpen = isRegistrationOpen({
    status: displayStage,
    registrationEnd: hackathon.registrationEnd,
  })

  const isRaceStage = displayStage === "ACTIVE" || displayStage === "JUDGING" || displayStage === "COMPLETED"
  // Standings only once the race is on — before it, every agent would sit at zero.
  const raceView: RaceLeaderboardView | null =
    race && isRaceStage ? await loadRaceLeaderboard(hackathon.id, race) : null
  const isLiveField = !!raceView && raceView.leaderboard.agents.length > 0
  // Every agent's standing through the race, for the bar race.
  const replayFrames =
    race && raceView?.leaderboard.scored && isLiveField
      ? await getCachedRaceReplay(
          hackathon.id,
          race.start.toISOString(),
          race.end.toISOString(),
          raceView.leaderboard.teamVotes,
        )
      : null

  const isPostRace = displayStage === "JUDGING" || displayStage === "COMPLETED"
  const leaderboardIntro =
    displayStage === "ACTIVE"
      ? `Live standings for the ${raceHours}-hour race — agents ranked by Volume, P&L, and HBOT Vote.`
      : displayStage === "JUDGING"
        ? "The race is over. These standings are provisional while results are finalized."
        : displayStage === "COMPLETED"
          ? "Final standings — agents ranked by Volume, P&L, and HBOT Vote."
          : `Once the ${raceHours}-hour race begins, agents are ranked here by Volume, P&L, and HBOT Vote.`

  const teamSlugs = hackathon.teams.map((t) => t.slug)
  const rankedDrivers = totalRankedDrivers(teamSlugs, hackathon.maxSelections)

  const teamsWithSlots = hackathon.teams.map((t) => {
    const filled = t.agents.filter((a): a is NonNullable<typeof a> => a !== null).length
    return { ...t, filled, open: hackathon.maxSelections - filled }
  })

  const TIMELINE_PHASES = getStagePhases(hackathon)
  const registrationEndLabel = hackathon.registrationEnd
    ? fmtFull(new Date(hackathon.registrationEnd))
    : null

  // The voting window, from the linked Snapshot proposal itself once there is one.
  const vote = raceView?.leaderboard.vote
  const votingWindow =
    vote?.status === "live"
      ? vote.state === "pending"
        ? `Voting opens on Snapshot at **${fmtUtcMinute(new Date(vote.start))} UTC** and closes at **${fmtUtcMinute(new Date(vote.end))} UTC**.`
        : vote.state === "active"
          ? `Voting is open on Snapshot until **${fmtUtcMinute(new Date(vote.end))} UTC**.`
          : `Voting closed on Snapshot at **${fmtUtcMinute(new Date(vote.end))} UTC**.`
      : `Voting opens on Snapshot at **${fmtUtcMinute(VOTING_START)} UTC** (4pm Singapore) and runs ${VOTING_DURATION_HOURS} hours, closing after the race ends.`

  // The edition's own FAQ (admin-edited), or the default template, with
  // {{tokens}} filled from this hackathon's data.
  const savedFaq = hackathon.faq ? parseFaq(hackathon.faq) : null
  const faqSource = savedFaq && "items" in savedFaq ? savedFaq.items : DEFAULT_FAQ
  const topVotePoints = VOTE_POINTS_STEP * teamSlugs.length
  const weight = Object.fromEntries(SCORING_CRITERIA.map((c) => [c.key, c.weight]))
  const multiplier = Object.fromEntries(SCORING_CRITERIA.map((c) => [c.key, c.multiplier]))
  const snapshotUrl = `https://snapshot.org/#/${SNAPSHOT_SPACE}`
  const faqContext = {
    title: hackathon.title,
    startingCapital: SQUAD_RULES.startingCapitalAmount,
    agents: String(rankedDrivers),
    agentsPerTeam: agentCountPhrase(hackathon.maxSelections),
    raceHours: String(raceHours),
    raceStart: raceStartLabel,
    registrationEnd: registrationEndLabel ?? "the submission deadline",
    winnersAnnounced: fmtFull(new Date(hackathon.endDate)),
    timeline: TIMELINE_PHASES.map((p, i) => `${i + 1}. **${p.label}${p.date ? ` (${p.date})` : ""}** — ${p.desc}`).join("\n"),
    eligibleExchanges: ELIGIBLE_EXCHANGES.map((e) => `- **${e}**`).join("\n"),
    scoringCriteria: SCORING_CRITERIA.map((c) => `- **${c.label} (${c.weight}%)**`).join("\n"),
    finalsCodeFreeze: race ? fmtFull(race.codeFreeze) : `${FINALS_CODE_FREEZE_HOURS} hours before the race`,
    codeFreezeHours: String(FINALS_CODE_FREEZE_HOURS),
    weightPnl: `${weight.pnl}%`,
    weightVolume: `${weight.volume}%`,
    weightVote: `${weight.vote}%`,
    multiplierPnl: String(multiplier.pnl),
    multiplierVolume: String(multiplier.volume),
    multiplierVote: String(multiplier.vote),
    voteRule: `HBOT holders back the teams on [Snapshot](${snapshotUrl}), and teams are ranked by the HBOT they receive; the top team earns ${topVotePoints} vote points, the next ${topVotePoints - VOTE_POINTS_STEP}, and so on down by ${VOTE_POINTS_STEP}, and each of a team's agents carries its team's vote points. Vote points follow the running tally on Snapshot and are final once the vote closes`,
    votingWindow,
    snapshotUrl,
    votingHours: String(VOTING_DURATION_HOURS),
    voteClosesAfterRace: String(VOTING_DURATION_HOURS - raceHours),
    topVotePoints: String(topVotePoints),
    voteStep: String(VOTE_POINTS_STEP),
  }
  const faqItems = faqSource
    .filter((item) => isFaqItemVisible(item, { registrationOpen: displayRegistrationOpen, stage: displayStage }))
    .map((item) => ({ q: renderFaqText(item.q, faqContext), a: renderFaqText(item.a, faqContext) }))

  // Results: the top three finishers over the race figures. Provisional in
  // Judging, final once Completed.
  // A podium needs readings: with none (feed down the whole race) every agent
  // sits at zero and the whole field ties for first.
  const showResults =
    isPostRace && !!raceView?.leaderboard.scored && isLiveField && raceView.leaderboard.agents.some((a) => a.reporting)
  const resultsSection =
    showResults && raceView ? (
      <section data-panel id="winners" className="w-full">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <PanelTitle
            title="Winner's Podium"
            subtitle={
              displayStage === "COMPLETED"
                ? "The top three finishers and the prizes they took home."
                : "The top three finishers, provisional while results are finalized."
            }
          />
          <RaceResults
            leaderboard={raceView.leaderboard}
            teams={hackathon.teams}
            hackathonSlug={hackathon.slug}
            provisional={displayStage !== "COMPLETED"}
          />
        </div>
      </section>
    ) : null

  // While the race runs: the live figures over the table.
  const liveStats =
    displayStage === "ACTIVE" && raceView?.leaderboard.scored ? (
      <div className="sd-reveal mb-10">
        <RaceMetrics leaderboard={raceView.leaderboard} teams={hackathon.teams} variant="live" />
      </div>
    ) : null

  // The race replayed on the running-order chart, with the field's volume.
  // eslint-disable-next-line react-hooks/purity -- as in Botcamp (its ESLint predates this rule)
  const elapsedHours = race ? (Date.now() - race.start.getTime()) / 3_600_000 : 0
  const replaySection =
    race && raceView && replayFrames && raceView.history.length > 1 ? (
      <section data-panel id="replay" className="w-full">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <PanelTitle
            title="Competition Replay"
            subtitle="Watch the field swap places and the volume climb through the race. Press play to run it again, or drag to any moment."
          />
          <div className="sd-reveal">
            <RaceHistoryReplay
              agents={raceView.leaderboard.agents}
              teams={hackathon.teams}
              checkpoints={raceView.history}
              frames={replayFrames}
              raceStart={race.start.toISOString()}
              raceHours={raceHours}
              endHour={Math.min(raceHours, Math.max(0, elapsedHours))}
              live={elapsedHours < raceHours}
            />
          </div>
        </div>
      </section>
    ) : null

  // Leaderboard — leads the page once the race is on.
  const leaderboardHeading = (
    <>
      {displayStage === "ACTIVE" && (
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
          Live · Hour by hour
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl mb-4">
        {displayStage === "ACTIVE" ? "Live Leaderboard" : "Leaderboard"}
      </h2>
      <p className="text-muted-foreground text-lg">
        {/* After the race the terms beside the table cover how agents are ranked. */}
        {!isPostRace && (
          <>
            {leaderboardIntro} Each team&apos;s score is the sum of its {agentCountPhrase(hackathon.maxSelections)}.{" "}
          </>
        )}
        Click a row for the agent&apos;s full stats.
      </p>
    </>
  )
  // Standings only once the race is on — bots registered during the
  // Countdown would otherwise show up as a zeroed table.
  const standings =
    !raceView || !isLiveField ? (
      <Card className="border-border bg-card/80 backdrop-blur-xs">
        <CardContent className="p-8 text-center text-muted-foreground">
          {isRaceStage
            ? "Standings appear here as soon as the racing agents are registered."
            : `Standings appear here once the race starts on ${raceStartLabel}.`}
        </CardContent>
      </Card>
    ) : (
      <LeaderboardTable
        leaderboard={raceView.leaderboard}
        history={raceView.history}
        teams={hackathon.teams}
        hackathonSlug={hackathon.slug}
        raceStart={raceView.window.start.toISOString()}
        raceEnd={raceView.window.end.toISOString()}
        showTerms={!isPostRace}
      />
    )
  // Same layout in every stage: heading centered above the table. After the
  // race the terms and vote move up there, since the table drops them.
  const leaderboardSection = (
    <section data-panel id="leaderboard" className="w-full">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="sd-reveal mx-auto mb-[clamp(1.25rem,4svh,2.5rem)] max-w-2xl space-y-bc-4 text-center">
          <div>{leaderboardHeading}</div>
          {isPostRace && raceView && isLiveField && (
            <>
              <ScoringTerms
                agentCount={raceView.leaderboard.agents.length}
                teamCount={raceView.leaderboard.teams.length}
                brief
                className="text-sm leading-relaxed"
              />
              <HackathonVoteButton vote={raceView.leaderboard.vote} showStatus={false} />
            </>
          )}
        </div>
        {liveStats}
        <div className="sd-reveal min-w-0">{standings}</div>
        {!isPostRace && raceView && isLiveField && (
          <div className="sd-reveal mt-8 text-center">
            <HackathonVoteButton vote={raceView.leaderboard.vote} />
          </div>
        )}
      </div>
    </section>
  )

  // The grid's line follows the stage: picking, lining up, racing, raced.
  const agentsPhrase = agentCountPhrase(hackathon.maxSelections)
  const gridSubtitle = isPostRace
    ? `Each sponsor team fielded ${agentsPhrase}. Here's who raced under each flag.`
    : displayStage === "ACTIVE"
      ? `Each sponsor team fields ${agentsPhrase}. Here's who's racing under each flag right now.`
      : displayStage === "COUNTDOWN"
        ? `Each sponsor team fields ${agentsPhrase}. Here's who's lining up under each flag.`
        : displayStage === "COMING_SOON"
          ? `Meet the teams fielding ${agentsPhrase} each in the ${hackathon.title}.`
          : `Each sponsor team fields ${agentsPhrase}. Seats fill as teams pick their drivers.`

  const statementLines = [
    `${rankedDrivers} agents.`,
    `${raceHours} hours.`,
    `${SQUAD_RULES.startingCapitalAmount} each. Real capital.`,
  ]

  const editionYear = (race?.end ?? new Date(hackathon.endDate)).getUTCFullYear()
  // After the race: the edition year on its own, huge, before the recap line.
  const yearSection = isPostRace ? (
    <section data-panel className="w-full overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <PanelTitle
          title={SEASON}
          subtitle={`The first ${hackathon.title}: a hackathon for AI trading agents, then a live race with real capital.`}
          className="mb-4 md:mb-6"
        />
      </div>
      <EditionYear
        text={String(editionYear)}
        label={`${hackathon.title} ${editionYear}`}
        sizeClassName="text-[clamp(5rem,min(32vw,30svh),28rem)]"
      />
      <p className="edition-year-dates mt-[clamp(1rem,3svh,2.5rem)] select-none text-center font-monoton leading-none text-[clamp(1.5rem,min(5vw,6svh),4.5rem)]">
        {fmtShort(new Date(hackathon.startDate))} – {fmtShort(new Date(hackathon.endDate))}
      </p>
      <div className="sd-reveal container mx-auto mt-[clamp(1.5rem,5svh,4rem)] max-w-5xl px-4 md:px-6">
        <h3 className="mb-6 text-center font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:mb-8">
          Sponsors
        </h3>
        <SponsorLogos teams={hackathon.teams} hackathonSlug={hackathon.slug} layout="row" />
      </div>
    </section>
  ) : null

  // Coming Soon: the same big entrance as the post-race year, announcing the edition.
  const comingSoonSection =
    displayStage === "COMING_SOON" ? (
      <section data-panel className="w-full overflow-hidden">
        <EditionYear
          text="Coming Soon"
          label={`${hackathon.title} — coming soon`}
          sizeClassName="text-[clamp(3.5rem,11vw,10rem)]"
        />
      </section>
    ) : null

  // Completed: the next season, and how to sponsor a team in it.
  const nextSeasonSection =
    displayStage === "COMPLETED" ? (
      <section data-panel id="next-season" className="w-full overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <PanelTitle
            title={NEXT_SEASON.name}
            subtitle={`The ${hackathon.title} returns in ${NEXT_SEASON.year}. Field a team of trading agents under your project's flag.`}
            className="mb-4 md:mb-6"
          />
        </div>
        <EditionYear
          text={NEXT_SEASON.year}
          label={`${hackathon.title} ${NEXT_SEASON.name}, ${NEXT_SEASON.year}`}
          sizeClassName="text-[clamp(4.5rem,min(24vw,26svh),20rem)]"
        />
        <div className="sd-reveal container mx-auto mt-[clamp(1.5rem,5svh,3.5rem)] flex flex-col items-center gap-4 px-4 md:px-6">
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <a href={operationsMailto("Hackathon sponsorship inquiry")}>Inquire About Sponsorship</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={SPONSOR_TELEGRAM} target="_blank" rel="noopener noreferrer">
                Message Us on Telegram
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Or email{" "}
            <a href={`mailto:${OPERATIONS_EMAIL}`} className="text-foreground underline-offset-4 hover:underline">
              {OPERATIONS_EMAIL}
            </a>
          </p>
        </div>
      </section>
    ) : null

  // After the race, the whole edition in numbers: who signed up, built and raced.
  const hackathonSection = isPostRace ? (
    <section data-panel className="w-full">
      <div className="container mx-auto px-4 md:px-6">
        <PanelTitle
          title="Phase 1: Hackathon"
          subtitle="Builders signed up, built their agents and applied to the sponsor teams, who each picked their drivers."
        />
        <ScrollStatement
          lines={[
            `${hackathon.registrants} builders registered.`,
            `${hackathon.submissions} agents submitted.`,
            `${rankedDrivers} agents selected.`,
          ]}
          accentLine={2}
        />
      </div>
    </section>
  ) : null

  // Interstitial statement — lights up word by word on scroll.
  const statementSection = (
    <section data-panel className="w-full">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollStatement lines={statementLines} accentLine={2} />
      </div>
    </section>
  )

  // Before the race, the sponsors open the grid section; after it, Season 1 lists them.
  const sponsors = (
    <>
      <PanelTitle
        title="Exchange Sponsors"
        subtitle={`Thank you to our Hummingbot exchange partners for sponsoring the ${hackathon.title}.`}
        className="mb-10 md:mb-12"
      />
      <div className="sd-reveal max-w-3xl mx-auto">
        <SponsorLogos teams={hackathon.teams} hackathonSlug={hackathon.slug} />
      </div>
    </>
  )

  // The starting grid — one card per team with its driver seats.
  const gridSection =
    teamsWithSlots.length > 0 ? (
      <section data-panel id="teams" className="w-full">
        <div className="container mx-auto px-4 md:px-6">
          {/* Coming Soon's sponsor cards already introduce the teams. */}
          {displayStage !== "COMING_SOON" && !isPostRace && <div className="mb-16 md:mb-24">{sponsors}</div>}

          <div className="sd-reveal text-center mb-[clamp(1rem,3svh,3rem)]">
            <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl mb-4 short:mb-2">
              {displayStage === "COMING_SOON" ? "The Sponsors" : isPostRace ? "Phase 2: Competition" : "The Starting Grid"}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {gridSubtitle}
            </p>
          </div>

          <TeamStartingGrid
            teams={teamsWithSlots}
            hackathonSlug={hackathon.slug}
            slotsPerSquad={hackathon.maxSelections}
            openSeatLabel={openSeatCopy(displayStage, displayRegistrationOpen).label}
            variant={displayStage === "COMING_SOON" ? "sponsors" : "grid"}
          />
          {/* After the race, the terms every seat raced on. */}
          {isPostRace && (
            <div className="mt-[clamp(1rem,3svh,3.5rem)]">
              <FactCards
                facts={[
                  {
                    label: "Starting Capital",
                    value: SQUAD_RULES.startingCapitalAmount,
                    note: "Real capital per agent",
                  },
                  {
                    label: "Hours of Racing",
                    value: raceHours,
                    note: race ? `${fmtShort(race.start)} – ${fmtShort(race.end)}, live on the sponsors' exchanges` : "Live on the sponsors' exchanges",
                  },
                ]}
              />
            </div>
          )}
        </div>
      </section>
    ) : null

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      {previewStage && (
        <div className="sticky top-16 z-50 border-b border-warning/40 bg-warning/15 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-warning backdrop-blur-md">
          Preview · {STAGE_LABELS[previewStage]} stage — the live page is still{" "}
          {STAGE_LABELS[hackathon.status]}
        </div>
      )}
      <main className="flex-1">
        {/* Hero — full-bleed video. On scroll it pushes in and darkens
            (.sd-hero-media) while the copy lifts away, and the bottom edge
            fades into the page backdrop so there's no hard seam. */}
        <section data-panel="hero" className="relative h-[calc(100svh-4rem)] min-h-[560px] overflow-hidden bg-[#0a0a0a]">
          <div className="sd-hero-media absolute inset-0">
            <video
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            >
              <source src="/botcamp-assets/horizontal-veo.mp4" type="video/mp4" />
            </video>
            {/* Dark scrim for text contrast */}
            <div className="absolute inset-0 bg-black/55" />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40" />
          </div>
          {/* Seamless hand-off into the backdrop below */}
          <div className="absolute inset-x-0 bottom-0 h-40 md:h-56 bg-gradient-to-b from-transparent to-background z-[5] pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 relative z-10 h-full flex items-center justify-center">
            <HackathonCountdown
              title={hackathon.title}
              subtitle="The first strategy hackathon and competition for AI trading agents, built on the Condor framework."
              stage={displayStage}
              registrationStart={hackathon.registrationStart}
              registrationEnd={hackathon.registrationEnd}
              raceStart={race?.start.toISOString() ?? null}
              raceEnd={race?.end.toISOString() ?? null}
              registerHref={`/hackathons/${hackathon.slug}/register`}
            />
          </div>
        </section>

        {/* Everything after the video shares one continuous backdrop. */}
        <RaceBackdrop>
          {/* Once the race is on, the standings lead; before it, the story builds up to them. */}
          {isRaceStage ? (
            <>
              {yearSection}
              {hackathonSection}
              {isPostRace && gridSection}
              {/* While the race runs, the field-size line still opens the standings. */}
              {!isPostRace && statementSection}
              {replaySection}
              {resultsSection}
              {leaderboardSection}
              {/* While the race runs, the grid follows the standings. */}
              {!isPostRace && gridSection}
              {nextSeasonSection}
            </>
          ) : (
            <>
              {comingSoonSection}
              {statementSection}
              {gridSection}
              {/* No standings before the race: there is nothing to rank yet. */}
            </>
          )}

          {/* FAQ */}
          <section data-panel className="w-full">
            <div className="container mx-auto px-4 md:px-6 max-w-4xl">
              <div className="sd-reveal text-center mb-12">
                <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl mb-4">
                  Frequently Asked Questions
                </h2>
              </div>
              <Card className="sd-reveal border-border bg-card/80 backdrop-blur-xs">
                <CardContent className="p-6 md:p-8">
                  <FAQAccordion items={faqItems} initialCount={6} />
                </CardContent>
              </Card>
            </div>
          </section>
        </RaceBackdrop>
      </main>
      <SectionPager />
      <SiteFooter />
    </div>
  )
}
