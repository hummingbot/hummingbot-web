import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/botcamp/lib/api-utils"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { StatusBadge } from "@/botcamp/components/ui/status-badge"
import { TabsList, TabsTrigger, TabsContent } from "@/botcamp/components/ui/tabs"
import { UrlSyncedTabs } from "@/botcamp/components/admin/UrlSyncedTabs"
import { HackathonsTable } from "@/botcamp/components/admin/HackathonsTable"
import { AdminApplicationsTable } from "@/botcamp/components/admin/AdminApplicationsTable"
import { HackathonStatCard } from "@/botcamp/components/admin/HackathonStatCard"
import { RegistrantsStatTrigger, RegistrantFunnelPanel, type FunnelStage } from "@/botcamp/components/admin/RegistrantFunnel"
import { RegistrantFunnelProvider } from "@/botcamp/components/admin/RegistrantFunnelContext"
import { ApplicationsFilterProvider } from "@/botcamp/components/admin/ApplicationsFilterContext"
import { TeamsTable } from "@/botcamp/components/admin/TeamsTable"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { FinalRostersPanel } from "@/botcamp/components/admin/FinalRostersPanel"
import { HackathonStageControl } from "@/botcamp/components/admin/HackathonStageControl"
import { formatDate } from "@/botcamp/lib/format"
import { displayName, getHackathonDashboardData, buildFinalRosterTeams } from "@/botcamp/lib/hackathon-roster"
import { findRaceWindow, getStageWarnings, HACKATHON_STAGES } from "@/botcamp/lib/hackathon-stages"
import type { HackathonStatus } from "@prisma/client"
import { Plus, Pencil, Eye, Trophy, Radio, Database } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Hackathon - Admin - Botcamp",
}

async function getHackathons() {
  // Race clock may have moved the stage since the last render.
  await advanceDueHackathonStages()
  const hackathons = await prisma.hackathon.findMany({
    orderBy: { startDate: "desc" },
    include: {
      sessions: {
        select: { id: true, slug: true, date: true },
      },
      _count: {
        select: {
          applications: true,
          raceAgents: true,
        },
      },
      // Rank 1 is the winner, when the post-race results have been filled
      // in — surfaced on the History table so it's visible at a glance.
      applications: {
        where: { rank: 1 },
        select: {
          user: { select: { name: true, firstName: true, lastName: true, email: true } },
          strategy: { select: { title: true } },
        },
        take: 1,
      },
    },
  })

  // Serialize dates for client component
  return hackathons.map((hackathon) => ({
    id: hackathon.id,
    slug: hackathon.slug,
    title: hackathon.title,
    status: hackathon.status,
    startDate: hackathon.startDate.toISOString(),
    endDate: hackathon.endDate.toISOString(),
    registrationStart: hackathon.registrationStart?.toISOString() || null,
    registrationEnd: hackathon.registrationEnd?.toISOString() || null,
    raceStart: hackathon.raceStart?.toISOString() || null,
    raceEnd: hackathon.raceEnd?.toISOString() || null,
    // Where the race window comes from when Race Start isn't set.
    finalsSessions: hackathon.sessions.map((s) => ({ slug: s.slug, date: s.date })),
    voteLinked: hackathon.snapshotProposalId !== null,
    teamsCount: hackathon.teamIds.length,
    faqCustomized: hackathon.faq !== null,
    maxParticipants: hackathon.maxParticipants,
    sessionsCount: hackathon.sessions.length,
    winnerName: hackathon.applications[0] ? displayName(hackathon.applications[0].user) : null,
    winnerStrategyTitle: hackathon.applications[0]?.strategy?.title ?? null,
    _count: hackathon._count,
  }))
}

type Hackathon = Awaited<ReturnType<typeof getHackathons>>[number]

// Derived from status alone (never a hardcoded id/slug) so this page stays
// correct as hackathons open, run, and complete. A live hackathon (Coming Soon
// through Judging) always wins. Otherwise the newest of the rest is current —
// the next edition's DRAFT once it's created, or the last COMPLETED one — so
// the stage switcher is always at hand.
function resolveCurrentHackathon(hackathons: Hackathon[]): Hackathon | null {
  const byNewest = [...hackathons].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )
  return byNewest.find((h) => h.status !== "DRAFT" && h.status !== "COMPLETED") ?? byNewest[0] ?? null
}

function formatTimeUntil(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return "Passed"
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 48) return `${hours}h ${Math.floor((ms % 3_600_000) / 60_000)}m`
  return `${Math.ceil(ms / 86_400_000)} days`
}

// The countdown that matters to an admin changes with the stage: what the
// public page is counting toward, or the deadline that ends the stage.
function getStageTiming(h: Hackathon, now: Date): { label: string; value: string } {
  const race = findRaceWindow({ ...h, sessions: h.finalsSessions })
  switch (h.status) {
    case "DRAFT":
    case "COMING_SOON":
      return h.registrationStart
        ? { label: "Registration Opens", value: formatTimeUntil(new Date(h.registrationStart), now) }
        : { label: "Registration Opens", value: "Not set" }
    case "REGISTRATION":
      return h.registrationEnd
        ? { label: "Applications Close", value: formatTimeUntil(new Date(h.registrationEnd), now) }
        : { label: "Applications Close", value: "No deadline" }
    case "COUNTDOWN":
      return { label: "Race Starts In", value: race ? formatTimeUntil(race.start, now) : "Not set" }
    case "ACTIVE":
      return { label: "Race Ends In", value: race ? formatTimeUntil(race.end, now) : "Not set" }
    default:
      return { label: "Race Ended", value: race ? formatDate(race.end.toISOString()) : "—" }
  }
}

// Conversion funnel behind the "Registrants" stat card: of everyone who
// registered (HackathonEntry), how many went on to create/attach a
// strategy, submit it for review, rank teams, and get selected.
async function getRegistrantFunnel(
  hackathonId: string
): Promise<{ registrantsCount: number; stages: FunnelStage[] }> {
  const entries = await prisma.hackathonEntry.findMany({
    where: { hackathonId },
    select: {
      userId: true,
      user: { select: { name: true, firstName: true, lastName: true, email: true } },
    },
  })
  const registrantUserIds = entries.map((e) => e.userId)

  const [applications, strategyAuthors] = await Promise.all([
    prisma.application.findMany({
      where: { hackathonId },
      select: { userId: true, status: true, teamPreferences: true, selectedTeamId: true },
    }),
    // "Created a strategy" means an actual Strategy authored on Botcamp,
    // not just an Application with a strategyId — a registrant can build a
    // real strategy before ever starting (or without finishing) an
    // Application for this hackathon.
    prisma.strategyAuthor.findMany({
      where: { userId: { in: registrantUserIds } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ])

  const appByUserId = new Map(applications.map((a) => [a.userId, a]))
  const authorUserIds = new Set(strategyAuthors.map((a) => a.userId))

  const registered: string[] = []
  const createdStrategy: string[] = []
  const submitted: string[] = []
  const rankedTeams: string[] = []
  const selected: string[] = []

  for (const entry of entries) {
    const name = displayName(entry.user)
    registered.push(name)

    if (authorUserIds.has(entry.userId)) createdStrategy.push(name)

    const app = appByUserId.get(entry.userId)
    if (!app) continue
    if (app.status === "FINALIZED" || app.status === "REVIEWED") submitted.push(name)
    if (app.teamPreferences.length > 0) rankedTeams.push(name)
    if (app.selectedTeamId) selected.push(name)
  }

  return {
    registrantsCount: registered.length,
    stages: [
      { label: "Created a strategy", count: createdStrategy.length, names: createdStrategy },
      { label: "Submitted for review", count: submitted.length, names: submitted },
      { label: "Ranked teams", count: rankedTeams.length, names: rankedTeams },
      { label: "Selected by a team", count: selected.length, names: selected },
    ],
  }
}

// Teams are a reusable resource, not owned by a single hackathon
// (Hackathon.teamIds just references them) — this lists every team ever
// created, same as the old standalone /admin/teams page it replaced.
async function getAllTeams() {
  const teams = await prisma.team.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      members: {
        select: { id: true },
      },
    },
  })

  return teams.map((team) => ({
    id: team.id,
    slug: team.slug,
    name: team.name,
    description: team.description,
    logoUrl: team.logoUrl,
    logoUrlDark: team.logoUrlDark,
    websiteUrl: team.websiteUrl,
    sortOrder: team.sortOrder,
    membersCount: team.members.length,
    createdAt: team.createdAt.toISOString(),
  }))
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function AdminHackathonsPage({ searchParams }: PageProps) {
  // The admin layout also admits INSTRUCTORs (for their courses); this page
  // holds admin-only data, so send anyone else back to their courses.
  if (!(await requireAdmin())) redirect("/admin/courses")

  const { tab } = await searchParams
  const hackathons = await getHackathons()
  const current = resolveCurrentHackathon(hackathons)
  const registrationClosed =
    !!current && current.status !== "COMING_SOON" && current.status !== "REGISTRATION"
  // The current hackathon stays out of History while it's still open for
  // registration (nothing "previous" to browse yet), but once registration
  // closes it's useful to also reach it from here — e.g. to double-check
  // strategies/applications from the prior stage while it's still ACTIVE.
  const history = hackathons.filter((h) => h.id !== current?.id || !registrationClosed)

  const currentFull = current
    ? await prisma.hackathon.findUnique({
        where: { id: current.id },
        select: { teamIds: true, maxSelections: true },
      })
    : null

  const [
    { rows: applications, teamBreakdown, allSeatsFull, selectedCount, needsReviewCount },
    { registrantsCount, stages: registrantFunnelStages },
    nextSession,
  ] =
    current && currentFull
      ? await Promise.all([
          getHackathonDashboardData(current.id, currentFull.teamIds, currentFull.maxSelections),
          getRegistrantFunnel(current.id),
          prisma.hackathonSession.findFirst({
            where: { hackathonId: current.id, date: { gte: new Date() } },
            orderBy: { date: "asc" },
            select: { title: true, date: true },
          }),
        ])
      : [
          { rows: [], teamBreakdown: [], allSeatsFull: false, selectedCount: 0, needsReviewCount: 0 },
          { registrantsCount: 0, stages: [] as FunnelStage[] },
          null,
        ]

  const now = new Date()
  const timing = current ? getStageTiming(current, now) : null
  const currentRace = current ? findRaceWindow({ ...current, sessions: current.finalsSessions }) : null
  const stage = current?.status
  // From Countdown on, who is racing matters more than who still needs review.
  const isRacePhase =
    stage === "COUNTDOWN" || stage === "ACTIVE" || stage === "JUDGING" || stage === "COMPLETED"
  // Per-team counts include pre-filled seats; the top-level selectedCount doesn't.
  const totalSeats = teamBreakdown.reduce((sum, t) => sum + t.maxSelections, 0)
  const openSeats = teamBreakdown.reduce((sum, t) => sum + Math.max(0, t.maxSelections - t.selectedCount), 0)


  const warningsByStage = current
    ? (Object.fromEntries(
        HACKATHON_STAGES.map((s) => [
          s.value,
          getStageWarnings(
            s.value,
            {
              teamsCount: current.teamsCount,
              sessionsCount: current.sessionsCount,
              registrationStart: current.registrationStart,
              registrationEnd: current.registrationEnd,
              raceStart: current.raceStart,
              raceEnd: current.raceEnd,
              openSeats,
              raceAgentsCount: current._count.raceAgents,
              voteLinked: current.voteLinked,
              faqCustomized: current.faqCustomized,
            },
            now,
          ),
        ]),
      ) as Record<HackathonStatus, string[]>)
    : null

  // Merge in the current hackathon's ranked/selected counts so the Teams tab
  // doesn't need its own separate "Team Breakdown" table — a team not
  // sponsoring the current hackathon just shows no current-hackathon stats.
  const allTeams = await getAllTeams()
  const breakdownById = new Map(teamBreakdown.map((t) => [t.id, t]))
  const teams = allTeams.map((team) => {
    const current = breakdownById.get(team.id)
    return {
      ...team,
      currentApplicants: current?.preferenceCount ?? null,
      currentApplicantNames: current?.applicantNames ?? [],
      currentSelected: current?.selectedCount ?? null,
      currentMaxSelections: current?.maxSelections ?? null,
      currentSelectedNames: current?.selectedApplicantNames ?? [],
    }
  })

  // Only the current hackathon's own sponsor teams belong in the roster
  // view — allTeams also carries every team from past hackathons.
  const allTeamsById = new Map(allTeams.map((t) => [t.id, t]))
  const finalRosterTeams = buildFinalRosterTeams(teamBreakdown, allTeamsById)

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Hackathon"
        description="Review applications for the current hackathon and browse past ones"
        variant="admin"
        actions={
          <Button asChild>
            <Link href="/admin/hackathons/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Hackathon
            </Link>
          </Button>
        }
      />

      <UrlSyncedTabs defaultValue={tab === "teams" ? "teams" : tab === "history" ? "history" : "overview"}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-bc-6 mt-6">
      {current && (
        <ApplicationsFilterProvider>
        <RegistrantFunnelProvider>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <RegistrantsStatTrigger registrantsCount={registrantsCount} />
            <HackathonStatCard
              label="Applications"
              value={String(current._count.applications)}
              filterValue="all"
            />
            <HackathonStatCard label="Selected" value={String(selectedCount)} filterValue="selected" />
            {isRacePhase ? (
              <HackathonStatCard
                label="Race Agents"
                value={`${current._count.raceAgents}/${totalSeats}`}
              />
            ) : (
              <HackathonStatCard
                label="Needs Review"
                value={String(needsReviewCount)}
                filterValue="FINALIZED"
              />
            )}
            <HackathonStatCard label={timing?.label ?? "Time Left"} value={timing?.value ?? "—"} />
          </div>

          {!allSeatsFull && (
            <RegistrantFunnelPanel registrantsCount={registrantsCount} stages={registrantFunnelStages} />
          )}

          <Card className="border-botcamp-orange/40">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-bc-lg bg-botcamp-orange/10 p-3">
                    <Trophy className="h-6 w-6 text-botcamp-orange" />
                  </div>
                  <div className="space-y-bc-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Current Hackathon
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">{current.title}</h2>
                      <StatusBadge value={current.status} type="status" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(current.startDate)} - {formatDate(current.endDate)} ·{" "}
                      {current.sessionsCount} session{current.sessionsCount === 1 ? "" : "s"}
                      {registrationClosed && (
                        <>
                          {" "}
                          · <span className="text-warning">Applications closed</span> — team
                          preferences are locked
                        </>
                      )}
                      {isRacePhase && currentRace && (
                        <>
                          {" "}
                          · Race {formatDate(currentRace.start.toISOString())}
                        </>
                      )}
                      {nextSession && (
                        <>
                          {" "}
                          · Next: {nextSession.title}
                          {nextSession.date && ` (${formatDate(nextSession.date)})`}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/hackathons/${current.slug}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/hackathons/${current.id}/race-feed`}>
                      <Radio className="mr-2 h-4 w-4" />
                      Race Feed
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/hackathons/${current.id}/agent-data`}>
                      <Database className="mr-2 h-4 w-4" />
                      Agent Data
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/hackathons/${current.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>

            {warningsByStage && (
              <CardContent className="border-t border-border pt-6">
                <HackathonStageControl
                  hackathonId={current.id}
                  hackathonSlug={current.slug}
                  status={current.status}
                  warningsByStage={warningsByStage}
                />
              </CardContent>
            )}

            {!allSeatsFull && (
              <CardContent className="border-t border-border pt-6">
                <AdminApplicationsTable applications={applications} hackathonId={current.id} compact />
              </CardContent>
            )}
          </Card>

          {(allSeatsFull || isRacePhase) && (
            <FinalRostersPanel
              teams={finalRosterTeams}
              hackathonId={current.id}
              // Only news while teams are still picking; from Countdown on the
              // stage itself means rosters are final.
              announceComplete={allSeatsFull && stage === "REGISTRATION"}
            />
          )}
        </RegistrantFunnelProvider>
        </ApplicationsFilterProvider>
      )}
      {!current && (
        <EmptyState
          icon="🏆"
          title="No hackathon running right now"
          description="The last one wrapped up — check History for its results, or create the next one to see it here."
          variant="card"
          action={
            <Button asChild>
              <Link href="/admin/hackathons/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Hackathon
              </Link>
            </Button>
          }
        />
      )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>History ({history.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <HackathonsTable hackathons={history} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-bc-0">
              <CardTitle>All Teams ({teams.length})</CardTitle>
              <Button asChild>
                <Link href="/admin/teams/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <TeamsTable teams={teams} />
            </CardContent>
          </Card>
        </TabsContent>
      </UrlSyncedTabs>
    </div>
  )
}
