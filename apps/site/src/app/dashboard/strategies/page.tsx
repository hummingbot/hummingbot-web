import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/botcamp/lib/preview-session"
import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { getEffectiveMembership } from "@/botcamp/lib/utils"
import { hasHackathonEntry } from "@/botcamp/lib/hackathon-data"
import { canAuthorDeleteStrategy } from "@/botcamp/lib/strategy-limits"
import { strategyCapRefusal } from "@/botcamp/lib/strategy-create"
import { agentHoldingReviewSlot, reviewSlotMessage } from "@/botcamp/lib/agent-upload"
import { getSeatTeams } from "@/botcamp/lib/strategy-edit"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { StrategyCard } from "@/botcamp/components/strategies/StrategyCard"
import { StrategySeatBadge } from "@/botcamp/components/strategies/StrategySeatBadge"
import { CreateStrategyButton } from "@/botcamp/components/dashboard/CreateStrategyButton"
import { DeleteStrategyButton } from "@/botcamp/components/dashboard/DeleteStrategyButton"
import { AgentVersionStatusBadge } from "@/botcamp/components/agents/AgentVersionStatusBadge"
import { readPageSuggestions } from "@/botcamp/lib/agent-page-suggestions"
import { Pencil, Lightbulb, GraduationCap, Eye } from "lucide-react"
import { strategyStatusColors, cardStyles } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"

export const metadata = {
  title: "Strategies & Agents - Dashboard - Hummingbot",
}

async function getUserData(userId: string) {
  const [strategies, user, hasHackathonAccess, activeHackathon] = await Promise.all([
    prisma.strategy.findMany({
      where: {
        authors: {
          some: {
            userId,
          },
        },
      },
      include: {
        cohortRelation: {
          select: {
            number: true,
          },
        },
        files: {
          select: {
            id: true,
          },
        },
        // An agent's state is its newest version's review.
        agentVersions: {
          select: { version: true, status: true },
          orderBy: { version: "desc" },
          take: 1,
        },
        authors: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isMember: true },
    }),
    hasHackathonEntry(userId),
    prisma.hackathon.findFirst({
      where: { status: { in: CURRENT_HACKATHON_STATUSES } },
      orderBy: { startDate: "desc" },
      select: { slug: true },
    }),
  ])

  const seatTeams = await getSeatTeams(strategies.map((s) => s.id))

  // Transform strategies for display
  const transformedStrategies = strategies.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    tags: s.tags,
    exchanges: s.exchanges,
    cohort: s.cohortRelation?.number ?? null,
    hasFiles: s.files.length > 0,
    videoURL: s.videoURL,
    status: s.status,
    visibility: s.visibility,
    seatTeam: seatTeams.get(s.id) ?? null,
    // Where an agent's review stands, and whether a reviewer is waiting on
    // the author to answer suggestions for its page.
    agentReview:
      s.strategyType === "AGENT"
        ? { latest: s.agentVersions[0] ?? null, hasSuggestions: readPageSuggestions(s.pageSuggestions) !== null }
        : null,
    coAuthors: s.authors
      .filter((a) => a.userId !== userId)
      .map((a) => `${a.user.firstName || ""} ${a.user.lastName || ""}`.trim()),
  }))
  // Strategies holding a hackathon seat lead the list; the rest keep newest-first.
  // Array.prototype.sort is stable, so ties keep their createdAt order.
  transformedStrategies.sort((a, b) => Number(!!b.seatTeam) - Number(!!a.seatTeam))

  const { isMember } = getEffectiveMembership(user ?? {})
  // Hackathon applicants aren't cohort members, but they still need to be
  // able to create an Agent/Controller strategy to apply to a team.
  // Everyone else can still share a Condor agent (see Strategy.agentApprovalRequired).
  const canCreate = isMember || hasHackathonAccess
  // The overall or the draft cap, explained in place of the Create button.
  // An agent in review, or rejected and not yet fixed, holds the one review
  // slot (agentHoldingReviewSlot): no other agent until it's approved. Other
  // strategies only follow the usual caps.
  const holder = user?.role === "ADMIN" ? null : await agentHoldingReviewSlot(userId)
  const agentRefusal = holder ? { error: reviewSlotMessage(holder) } : null
  const createRefusal = await strategyCapRefusal(userId, user?.role ?? "STUDENT")
  const hackathonHref = activeHackathon
    ? `/dashboard/hackathons/${activeHackathon.slug}`
    : "/hackathons"
  return { strategies: transformedStrategies, isMember, canCreate, createRefusal, agentRefusal, hackathonHref }
}

export default async function MyStrategiesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  const { strategies, canCreate, createRefusal, agentRefusal, hackathonHref } = await getUserData(session.user.id)
  const agentButton = agentRefusal ? null : <CreateStrategyButton type="AGENT" label="Create Condor Agent" />
  // Members and hackathon builders can create either; everyone else, agents.
  const createButtons = canCreate ? (
    <div className="flex flex-wrap gap-3">
      {agentButton}
      <CreateStrategyButton variant="outline" />
    </div>
  ) : (
    agentButton
  )

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Strategies & Agents"
        description="Manage strategies you've authored"
        variant="admin"
        actions={createRefusal ? undefined : createButtons}
      />

      {(createRefusal ?? agentRefusal) && (
        <p className="text-sm text-muted-foreground">{(createRefusal ?? agentRefusal)!.error}.</p>
      )}

      {!canCreate && strategies.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={GraduationCap}
              title="Join a hackathon or cohort to create strategies"
              description="Strategy creation is available to cohort members and registered hackathon builders. You can still share a Condor agent: it's listed once it passes review."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  {agentButton}
                  <Button asChild>
                    <Link href={hackathonHref}>Go to Hackathon Hub</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/botcamp#cohorts">View Cohorts</Link>
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : strategies.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={Lightbulb}
              title="No strategies yet"
              description="Create a Condor agent or a trading strategy, then submit it for review."
              action={<div className="flex justify-center">{createButtons}</div>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-bc-4">
          {strategies.map((strategy, index) => (
            <div
              key={strategy.id}
              className={cn(
                "bg-card rounded-bc-xl border overflow-hidden",
                cardStyles.hover,
                cardStyles.enter,
              )}
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: "backwards",
              }}
            >
              <StrategyCard
                strategy={strategy}
                hideAuthor
                asDiv
                slugBadge={
                  strategy.seatTeam ? <StrategySeatBadge teamName={strategy.seatTeam} /> : undefined
                }
              />
              {/* Status bar */}
              <div className="border-t px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    Status:
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        strategyStatusColors[strategy.status]?.bg,
                        strategyStatusColors[strategy.status]?.iconColor,
                        strategyStatusColors[strategy.status]?.border
                      )}
                    >
                      {strategy.status}
                    </Badge>
                  </span>

                  {strategy.agentReview && (
                    <span className="flex items-center gap-2">
                      Review:
                      {strategy.agentReview.latest ? (
                        <AgentVersionStatusBadge status={strategy.agentReview.latest.status} />
                      ) : (
                        <span className="text-muted-foreground">No package yet</span>
                      )}
                      {strategy.agentReview.hasSuggestions && (
                        <Badge variant="outline" className="border-primary/50 text-xs text-primary">
                          Suggestions to review
                        </Badge>
                      )}
                    </span>
                  )}

                  <span className="flex items-center gap-2 text-muted-foreground">
                    Visibility:
                    <span className="text-foreground">{strategy.visibility}</span>
                  </span>
                  {strategy.coAuthors.length > 0 && (
                    <span className="text-muted-foreground">
                      Co-authors: {strategy.coAuthors.join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" asChild className="w-24">
                    <Link href={`/hub/${strategy.slug}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="w-24">
                    <Link href={`/dashboard/strategies/${strategy.id}`}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  {canAuthorDeleteStrategy(strategy.status) && (
                    <DeleteStrategyButton strategyId={strategy.id} title={strategy.title} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
