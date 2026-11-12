import "server-only"
import { cache } from "react"
import { prisma } from "@/botcamp/lib/prisma"
import {
  PUBLISHED_STRATEGY_WHERE,
  decideSignedOutStrategyCodeAccess,
  isAwaitingAgentApproval,
  isFreePreviewStrategy,
} from "@/botcamp/lib/strategy-access"
import { servableAvatarUrl } from "@/botcamp/lib/botcamp-assets"

// Botcamp's GET /api/strategies/[slug] (origin/main), read on the server for
// the strategy page (/hub/[slug]) as a signed-out visitor sees it. Botcamp's
// page fetches it in the browser with the session; this site has none, so:
//
// - an agent awaiting approval, a draft or one still in review is "not found"
//   (Botcamp 404s them for everyone but authors, admins and reviewers);
// - code and resources are never sent (hasContentAccess is false for every
//   signed-out visitor: Botcamp asks for a sign-in first, Example and free
//   strategies included), and `lockedReason` says which locked copy shows;
// - the Discussion tab is never offered (members only).

export type StrategyType = "AGENT" | "SCRIPT" | "CONTROLLER" | "V1_STRATEGY" | "OTHER"
export type StrategyVisibility = "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE"

export interface StrategyDetailAuthor {
  id: string
  slug: string | null
  firstName: string | null
  lastName: string | null
  /** Null when Botcamp serves it from its own API (uploads): initials instead. */
  avatarUrl: string | null
}

export interface StrategyDetail {
  id: number
  slug: string
  title: string
  tags: string[]
  exchanges: string[]
  summary: string | null
  details: string | null
  videoURL: string | null
  cohort: number | null
  authors: StrategyDetailAuthor[]
  visibility: StrategyVisibility
  strategyType: StrategyType
  updatedAt: string
  /** Why Code & Resources are locked for a signed-out visitor. */
  lockedReason: "racing" | "private" | "signin"
  /** Latest APPROVED Condor agent version, or null when there's none to clone. */
  condorVersion: number | null
  /** That version's package, as Condor's catalogue lists it (not shown by Botcamp). */
  condorPackage: { sha256: string; size: number; publishedAt: string } | null
  /** Pulling it needs no membership (Botcamp's free-preview set). */
  free: boolean
}

async function resolveWhere(slug: string): Promise<{ id: number } | { slug: string }> {
  const isNumericId = /^\d+$/.test(slug)
  if (isNumericId) return { id: parseInt(slug) }

  // Bare-slug fallback: `/strategies/perp-xemm` resolves to
  // `cohort-13-perp-xemm`, a published one first.
  const exact = await prisma.strategy.findUnique({ where: { slug }, select: { id: true } })
  if (exact) return { slug }
  const aliasOrder = [{ cohortId: "desc" as const }, { createdAt: "desc" as const }]
  const alias =
    (await prisma.strategy.findFirst({
      where: { slug: { endsWith: `-${slug}` }, ...PUBLISHED_STRATEGY_WHERE },
      orderBy: aliasOrder,
      select: { id: true },
    })) ??
    (await prisma.strategy.findFirst({
      where: { slug: { endsWith: `-${slug}` } },
      orderBy: aliasOrder,
      select: { id: true },
    }))
  return alias ? { id: alias.id } : { slug }
}

/** The strategy as Botcamp shows it signed out, or null where Botcamp 404s. */
export const getPublicStrategy = cache(async (slug: string): Promise<StrategyDetail | null> => {
  const where = await resolveWhere(slug)
  const strategy = await prisma.strategy.findUnique({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      details: true,
      tags: true,
      exchanges: true,
      videoURL: true,
      status: true,
      visibility: true,
      strategyType: true,
      agentApprovalRequired: true,
      agentVersions: {
        where: { status: "APPROVED" },
        select: { version: true, sha256: true, size: true, reviewedAt: true, createdAt: true },
        orderBy: { version: "desc" },
        take: 1,
      },
      updatedAt: true,
      authors: {
        select: {
          user: {
            select: { id: true, firstName: true, lastName: true, slug: true, avatarUrl: true },
          },
        },
      },
      cohortRelation: { select: { number: true } },
    },
  })
  if (!strategy) return null

  const access = await decideSignedOutStrategyCodeAccess(strategy)
  // The page is for published strategies; an agent awaiting approval is its
  // authors', admins' and reviewers' only.
  if (isAwaitingAgentApproval(strategy) || access === "not_found") return null

  const latest = strategy.strategyType === "AGENT" ? strategy.agentVersions[0] : undefined

  return {
    id: strategy.id,
    slug: strategy.slug,
    title: strategy.title,
    tags: strategy.tags,
    exchanges: strategy.exchanges,
    summary: strategy.summary,
    details: strategy.details,
    videoURL: strategy.videoURL,
    cohort: strategy.cohortRelation?.number ?? null,
    authors: strategy.authors.map(({ user }) => ({
      id: user.id,
      slug: user.slug,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: servableAvatarUrl(user.avatarUrl),
    })),
    visibility: strategy.visibility,
    strategyType: strategy.strategyType,
    updatedAt: strategy.updatedAt.toISOString(),
    lockedReason: access === "racing" ? "racing" : access === "private" ? "private" : "signin",
    condorVersion: latest?.version ?? null,
    condorPackage: latest
      ? {
          sha256: latest.sha256,
          size: latest.size,
          publishedAt: (latest.reviewedAt ?? latest.createdAt).toISOString(),
        }
      : null,
    free: await isFreePreviewStrategy(strategy.id),
  }
})

// ── Fallback: Botcamp's own signed-out answer ────────────────────────────
// Where this site's copy of the Botcamp database doesn't have the strategy
// (a local snapshot lags production, and anonymises slugs), ask Botcamp's
// public GET /api/strategies/<slug> anonymously — the same request its page
// makes for a signed-out visitor, so Botcamp applies its own rules (404 for
// drafts and agents awaiting approval; no files, images or code access).
// The package facts come from Condor's catalogue (lib/hub), which lists
// exactly the agents Botcamp lets Condor clone.

type BotcampStrategyResponse = {
  id: number
  slug: string
  title: string
  tags?: string[]
  exchanges?: string[]
  summary: string | null
  details: string | null
  videoURL: string | null
  cohort: number | null
  authors?: { user: { id: string; slug: string | null; firstName: string | null; lastName: string | null; avatarUrl: string | null } }[]
  visibility: StrategyVisibility
  strategyType: StrategyType
  updatedAt: string
  isRacing?: boolean
  condorVersion: number | null
}

export const getBotcampStrategy = cache(async (slug: string): Promise<StrategyDetail | null> => {
  const { BOTCAMP_URL, getHubAgent } = await import("@/lib/hub")
  const res = await fetch(`${BOTCAMP_URL}/api/strategies/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return null
  const s = (await res.json()) as BotcampStrategyResponse
  const lockedReason = s.isRacing ? "racing" : s.visibility === "PRIVATE" ? "private" : "signin"
  const listed =
    s.condorVersion !== null && lockedReason === "signin" ? await getHubAgent(s.slug).catch(() => null) : null
  const condorPackage =
    listed && listed.version === s.condorVersion
      ? { sha256: listed.digest, size: listed.bytes, publishedAt: listed.publishedAt }
      : null

  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    tags: s.tags ?? [],
    exchanges: s.exchanges ?? [],
    summary: s.summary,
    details: s.details,
    videoURL: s.videoURL,
    cohort: s.cohort,
    authors: (s.authors ?? []).map(({ user }) => ({
      id: user.id,
      slug: user.slug,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: servableAvatarUrl(user.avatarUrl),
    })),
    visibility: s.visibility,
    strategyType: s.strategyType,
    updatedAt: s.updatedAt,
    lockedReason,
    condorVersion: s.strategyType === "AGENT" ? s.condorVersion : null,
    condorPackage,
    free: listed?.free ?? false,
  }
})
