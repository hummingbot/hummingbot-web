import type { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { getEffectiveMembership } from "@/botcamp/lib/utils"
import { RACE_OVER_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"
// Prices live in strategy-unlock so client components can read them without Prisma.
import { STRATEGY_UNLOCK_DURATION_DAYS } from "@/botcamp/lib/strategy-unlock"
export { STRATEGY_UNLOCK_PRICE_CENTS, STRATEGY_UNLOCK_DURATION_DAYS } from "@/botcamp/lib/strategy-unlock"



// A hackathon whose race is over, by its stage alone (RACE_OVER_STATUSES):
// the stage advance owns the clock, raceEnd and the finals-session fallback
// both. Until then its entries are competitive secrets — rivals are members
// too, and an entry's code made public at submission could be read (and
// copied, or traded against) before or during the race. `status` is never
// null, so the negation below is safe in SQL.
export const raceOverWhere: Prisma.HackathonWhereInput = { status: { in: RACE_OVER_STATUSES } }
const racingWhere: Prisma.HackathonWhereInput = { status: { notIn: RACE_OVER_STATUSES } }

// What makes an application a hackathon entry, for every check that asks:
// submitted (FINALIZED/REVIEWED), or picked by a team for its squad whatever
// its status now — a builder can reopen a selected application to DRAFT, and
// it still races. The checks used to disagree on that, and a reopened entry
// fell out of "racing" while staying in the squad.
const HACKATHON_ENTRY: Prisma.ApplicationWhereInput = {
  OR: [{ status: { in: ["FINALIZED", "REVIEWED"] } }, { selectedTeamId: { not: null } }],
}

// "Example" strategies — seeded under the Cohort with number 0 (see the
// `cohort === 0 ? "Example" : ...` convention used across the strategy UI) —
// are always free to view in full, since they exist to demo the platform
// rather than to be gated. So are strategies an admin marked `isFree` in the
// strategy editor — hackathon entries get it after the race, per strategy,
// from scripts/feature-hackathon-strategies.ts — and every agent that raced
// (a team picked it for its squad), with no flag needed, once that race is over. Every other certified
// strategy needs an active unlock (or cohort membership) beyond its public
// description. PRIVATE stays author+admin only.
function freePreviewWhere(): Prisma.StrategyWhereInput {
  return {
    visibility: { not: "PRIVATE" },
    OR: [
      { status: "CERTIFIED", cohortRelation: { number: 0 } },
      { isFree: true },
      {
        strategyType: "AGENT",
        applications: { some: { selectedTeamId: { not: null }, hackathon: raceOverWhere } },
      },
    ],
  }
}

export async function getFreePreviewStrategyIds(): Promise<Set<number>> {
  const strategies = await prisma.strategy.findMany({ where: freePreviewWhere(), select: { id: true } })
  return new Set(strategies.map((s) => s.id))
}

/** Whether one strategy is in the free-preview set, without listing the set. */
export async function isFreePreviewStrategy(strategyId: number): Promise<boolean> {
  return (await prisma.strategy.count({ where: { id: strategyId, ...freePreviewWhere() } })) > 0
}

// Terminal Stripe subscription statuses that mean the subscription can no
// longer grant access, even if `expiresAt` (the last known period end)
// hasn't been overwritten yet.
const INACTIVE_SUBSCRIPTION_STATUSES = ["canceled", "unpaid", "incomplete_expired"]

// `expiresAt: null` means an admin-granted, non-expiring access — treat it as
// never expiring rather than filtering it out.
const NOT_EXPIRED = { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }

export async function hasActiveStrategyUnlock(userId: string): Promise<boolean> {
  const grant = await prisma.strategyAccessGrant.findFirst({
    where: {
      userId,
      status: { notIn: INACTIVE_SUBSCRIPTION_STATUSES },
      ...NOT_EXPIRED,
    },
    select: { id: true },
  })
  return !!grant
}

// Full grant record for billing UI (status text + "Manage subscription").
// Returns the most recently created grant regardless of status, so a lapsed
// subscription still shows something explanatory instead of just "none".
export async function getLatestStrategyGrant(userId: string) {
  return prisma.strategyAccessGrant.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
}

// Currently-active grant for the admin "Strategy Access" panel — distinct
// from getLatestStrategyGrant, which returns the newest grant regardless of
// whether it's still active. Admins only need to know "do they have access
// right now," and creating a new manual grant while a lapsed one exists
// should still be allowed.
export async function getActiveStrategyGrant(userId: string) {
  return prisma.strategyAccessGrant.findFirst({
    where: {
      userId,
      status: { notIn: INACTIVE_SUBSCRIPTION_STATUSES },
      ...NOT_EXPIRED,
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      purchasedAt: true,
      stripeSubscriptionId: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

// Admin-granted access with no Stripe subscription behind it — indefinite
// (no expiresAt) until an admin revokes it.
export async function grantManualStrategyAccess(userId: string) {
  return prisma.strategyAccessGrant.create({
    data: {
      userId,
      status: "manual",
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      purchasedAt: true,
      stripeSubscriptionId: true,
    },
  })
}

// Buying any paid course also grants permanent strategy-library access,
// separate from the annual STRATEGY_UNLOCK_PRICE_CENTS subscription — no
// expiresAt, no underlying Stripe subscription. Idempotent per user: one
// course purchase is enough to grant it for good, so later course purchases
// (or webhook retries) must not create duplicate grants. Only applies to
// course checkouts completed from here on — not retroactive to enrollments
// that already existed before this was added.
export async function grantStrategyAccessFromCoursePurchase(userId: string): Promise<boolean> {
  const existing = await prisma.strategyAccessGrant.findFirst({
    where: { userId, status: "course-purchase" },
    select: { id: true },
  })
  if (existing) return false

  await prisma.strategyAccessGrant.create({
    data: { userId, status: "course-purchase" },
  })
  return true
}

// Cohort members (and ADMIN/INSTRUCTOR via getEffectiveMembership) always
// have access; everyone else needs a currently-active purchased grant.
export async function hasStrategyContentAccess(
  user: { id: string; role?: string | null; isMember?: boolean | null } | null | undefined
): Promise<boolean> {
  if (!user) return false
  const { isMember } = getEffectiveMembership(user)
  if (isMember) return true
  return hasActiveStrategyUnlock(user.id)
}

// Sponsor reviewers. A builder who applies to a hackathon ranks sponsor teams,
// and those teams have to read the agent they are being asked to field — so a
// member of a team this application ranked (or that already selected it) gets
// exactly three things on that one strategy:
//
//   1. read its code files
//   2. read its resource images
//   3. post a comment in Discussion
//
// That is the whole grant. A reviewer is NOT an author: they cannot edit or
// delete the strategy, change its status or visibility, touch its files, or
// edit anyone else's comment — every one of those stays on its own
// author/admin check. Nor does it extend to the rest of the library: it
// answers "is this user reviewing THIS strategy for their team", one strategy
// at a time, and a reviewer without a membership or unlock still hits the
// normal paywall everywhere else.
//
// It has to override status, visibility and the paywall for that one
// strategy, because entries are rarely CERTIFIED, are sometimes PRIVATE, and
// a sponsor rep is usually not a paying Botcamp member. The team review
// screen already reads the strategy straight from Prisma and inlines its text
// files, so without this the images and binaries it links to still 402/403 —
// the page showed code it could not actually serve.
//
// DRAFT applications don't count (nothing has been submitted yet), unless
// the team already selected it.
export async function canTeamReviewStrategy(
  strategyId: number,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  })
  if (memberships.length === 0) return false
  const teamIds = memberships.map((m) => m.teamId)

  const application = await prisma.application.findFirst({
    where: {
      strategyId,
      // Submitted and ranking the team, or selected by it in any status —
      // the same rule as teamCanReviewApplication.
      OR: [
        { status: { in: ["FINALIZED", "REVIEWED"] }, teamPreferences: { hasSome: teamIds } },
        { selectedTeamId: { in: teamIds } },
      ],
    },
    select: { id: true },
  })
  return !!application
}

// A strategy submitted to a hackathon is a competitive entry — its code and
// resources skip the usual "must be CERTIFIED" requirement (hackathon
// entries are rarely certified) but still need the normal unlock/membership
// gate: anyone with strategy content access (member or paid unlock) can view
// it like any other public strategy, everyone else can't — unless an admin
// marked it `isFree` (see getFreePreviewStrategyIds). The author and
// admins always see their own work; each of the 4 call sites applies this
// only in the non-author/non-admin branch. Sponsor/team reviewers see the
// code through the separate, dashboard-only application-review path instead.
// Only once that hackathon's race is over (raceOverWhere): until then an entry
// is as unpublished as a draft.
export async function isSubmittedToHackathon(strategyId: number): Promise<boolean> {
  const application = await prisma.application.findFirst({
    where: { strategyId, ...HACKATHON_ENTRY, hackathon: raceOverWhere },
    select: { id: true },
  })
  return !!application
}

// Entered in a hackathon whose race isn't over: its code is hidden from
// everyone but its authors, admins and the sponsor teams reviewing it —
// CERTIFIED, Example, isFree or an approved agent version notwithstanding.
// A rival who could read it before the race could copy it or trade against
// it. A race whose clock just ran out stays hidden until the stage advance
// moves it to Judging, run here so that's the next request, not the next
// page view.
export async function isRacingInHackathon(strategyId: number): Promise<boolean> {
  await advanceDueHackathonStages()
  const application = await prisma.application.findFirst({
    where: { strategyId, ...HACKATHON_ENTRY, hackathon: racingWhere },
    select: { id: true },
  })
  return !!application
}

// An agent version that passed the AI review and an admin's check is
// published in its own right — the registry's equivalent of CERTIFIED.
export async function hasApprovedAgentVersion(strategyId: number): Promise<boolean> {
  return (await prisma.agentVersion.count({ where: { strategyId, status: "APPROVED" } })) > 0
}

export type StrategyCodeAccess = "ok" | "not_found" | "racing" | "private" | "sign_in" | "payment"

export type StrategyCodeViewer = { id: string; role?: string | null; isMember?: boolean | null }

// Who may read a strategy's code and resources (files, images, the agent
// package), as one decision. Every route that serves them asks this rather
// than re-implementing the chain — the copies had drifted (the detail API
// listed drafts' files and link URLs to members):
//
//   1. its authors and admins, then the sponsor teams reviewing it: always
//   2. racing in a hackathon whose race isn't over: nobody else ("racing")
//   3. published — CERTIFIED, a hackathon entry whose race is over, or an
//      agent with an APPROVED version — or it doesn't exist ("not_found")
//   4. not PRIVATE, signed in, then free (getFreePreviewStrategyIds) or
//      paid for (membership or unlock). MEMBERS_ONLY was folded into PUBLIC
//      (scripts/migrate-members-only-to-public.ts) and reads as PUBLIC here
//
// `viewer` says which door let a privileged caller in, for routes that treat
// them differently (an approved agent's loose files, the reviewer UI).
export async function decideStrategyCodeAccess(
  strategy: { id: number; status: string; visibility: string; authors: { userId: string }[] },
  user: StrategyCodeViewer | null,
): Promise<{ access: StrategyCodeAccess; viewer: "admin" | "author" | "reviewer" | null }> {
  if (user?.role === "ADMIN") return { access: "ok", viewer: "admin" }
  if (user && strategy.authors.some((a) => a.userId === user.id)) return { access: "ok", viewer: "author" }
  if (user && (await canTeamReviewStrategy(strategy.id, user.id))) return { access: "ok", viewer: "reviewer" }

  const access = await (async (): Promise<StrategyCodeAccess> => {
    if (await isRacingInHackathon(strategy.id)) return "racing"
    const published =
      strategy.status === "CERTIFIED" ||
      (await isSubmittedToHackathon(strategy.id)) ||
      (await hasApprovedAgentVersion(strategy.id))
    if (!published) return "not_found"
    if (strategy.visibility === "PRIVATE") return "private"
    if (!user) return "sign_in"
    if (await isFreePreviewStrategy(strategy.id)) return "ok"
    return (await hasStrategyContentAccess(user)) ? "ok" : "payment"
  })()
  return { access, viewer: null }
}

export async function getStrategyCodeAccess(
  strategy: { id: number; status: string; visibility: string; authors: { userId: string }[] },
  user: StrategyCodeViewer | null,
): Promise<StrategyCodeAccess> {
  return (await decideStrategyCodeAccess(strategy, user)).access
}

// The signed-in caller as decideStrategyCodeAccess wants them, with
// membership read fresh from the database rather than the session token.
export async function sessionCodeViewer(
  session: { user?: { id?: string | null; role?: string | null } } | null,
): Promise<StrategyCodeViewer | null> {
  const id = session?.user?.id
  if (!id) return null
  const user = await prisma.user.findUnique({ where: { id }, select: { isMember: true } })
  return { id, role: session.user?.role, isMember: user?.isMember ?? false }
}

// The website's answer to a refused decideStrategyCodeAccess. `what` names
// what was asked for: "code" for files, "resources" for images.
export function strategyAccessDenied(access: Exclude<StrategyCodeAccess, "ok">, what: "code" | "resources") {
  const denied: Record<Exclude<StrategyCodeAccess, "ok">, { status: number; error: string }> = {
    not_found: { status: 404, error: "Strategy not found" },
    racing: { status: 403, error: `This strategy is racing in a hackathon — its ${what} opens when the race is over` },
    private: { status: 403, error: "Access denied" },
    sign_in: { status: 401, error: `Sign in required to access this strategy's ${what}` },
    payment: { status: 402, error: `Payment required to access this strategy's ${what}` },
  }
  const { status, error } = denied[access]
  return Response.json({ error }, { status })
}

// A strategy page anyone may open: CERTIFIED, entered in a hackathon (race
// over or not — the page shows; its code waits for the race), or an agent
// with an APPROVED version. Drafts and strategies still in review are their
// authors' business. PRIVATE ones are listed here too: PRIVATE hides code,
// not existence. Filter on visibility separately where a listing needs to.
export const PUBLISHED_STRATEGY_WHERE: Prisma.StrategyWhereInput = {
  OR: [
    { status: "CERTIFIED" as const },
    { applications: { some: HACKATHON_ENTRY } },
    { agentVersions: { some: { status: "APPROVED" as const } } },
  ],
}

// Not entered in a hackathon whose race is still on — the listing form of
// isRacingInHackathon, for catalogues that offer code to clone.
export function notRacingWhere(): Prisma.StrategyWhereInput {
  return {
    applications: {
      none: { ...HACKATHON_ENTRY, hackathon: racingWhere },
    },
  }
}

export async function isStrategyPublished(strategyId: number): Promise<boolean> {
  return (await prisma.strategy.count({ where: { id: strategyId, ...PUBLISHED_STRATEGY_WHERE } })) > 0
}

// A registry agent created outside the cohort/hackathon gate stays unpublished
// until a version passes review: /strategies leaves it out, and its detail
// page, metadata and OG image 404 for everyone but its authors and admins.
// Select `agentVersions` with approvedAgentVersionSelect to call this.
export const approvedAgentVersionSelect = {
  where: { status: "APPROVED" as const },
  select: { id: true },
  take: 1,
}

export function isAwaitingAgentApproval(strategy: {
  agentApprovalRequired: boolean
  agentVersions: unknown[]
}): boolean {
  return strategy.agentApprovalRequired && strategy.agentVersions.length === 0
}
