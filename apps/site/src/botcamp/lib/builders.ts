import "server-only"
import { prisma } from "@/botcamp/lib/prisma"
import { servableAvatarUrl } from "@/botcamp/lib/botcamp-assets"
import { approvedAgentVersionSelect, isAwaitingAgentApproval } from "@/botcamp/lib/strategy-access"
import { TESTIMONIAL_MEMBER_SLUGS, type TestimonialMember } from "@/botcamp/components/sections/testimonial-members"

// Botcamp's public member data, read on the server. Botcamp's pages fetch most
// of it in the browser from /api/members/<slug>; this site has no such API, so
// the same rules (who is listed, what a PRIVATE profile shows) live here.

function displayName(u: { name: string | null; firstName: string | null; lastName: string | null }) {
  return u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Anonymous"
}

// A PRIVATE profile only exists for members; non-members are always shown in
// full (as in Botcamp's /api/members/[slug]).
function isPrivateProfile(u: { isMember: boolean; profileVisibility: string }) {
  return u.isMember && u.profileVisibility !== "PUBLIC"
}

/* ---------- /builders (Botcamp's src/app/builders/page.tsx) ---------- */

export type BuilderStrategyType = "AGENT" | "CONTROLLER" | "SCRIPT" | "V1_STRATEGY" | "OTHER"

export interface DirectoryBuilder {
  id: string
  slug: string
  name: string
  tagline: string | null
  avatarURL: string | null
  storyURL: string | null
  isMember: boolean
  cohorts: number[]
  updatedAt: string
  createdAt: string
  strategies: Array<{ id: number; strategyType: BuilderStrategyType; cohort: number | null }>
}

export async function getDirectoryBuilders(): Promise<DirectoryBuilder[]> {
  // Builders directory lists every user who has authored at least one
  // strategy, regardless of profile visibility or strategy visibility. PRIVATE
  // profiles render a limited stub on click (see getBuilderProfile).
  const users = await prisma.user.findMany({
    where: { strategies: { some: {} } },
    select: {
      id: true,
      slug: true,
      name: true,
      firstName: true,
      lastName: true,
      tagline: true,
      avatarUrl: true,
      storyUrl: true,
      isMember: true,
      updatedAt: true,
      createdAt: true,
      strategies: {
        select: {
          strategy: {
            select: {
              id: true,
              strategyType: true,
              cohortRelation: { select: { number: true } },
            },
          },
        },
      },
      enrollments: {
        where: { cohortId: { not: null } },
        select: { cohort: { select: { number: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return users.map((u) => {
    const cohorts = Array.from(
      new Set(u.enrollments.map((e) => e.cohort?.number).filter((n): n is number => n != null)),
    ).sort((a, b) => b - a)

    // Every strategy the user authored counts — PRIVATE included (count +
    // cohort badge only; nothing about the strategy itself is shown).
    const strategies = u.strategies
      .map((sa) => sa.strategy)
      .filter((s): s is NonNullable<typeof s> => !!s)

    return {
      id: u.id,
      slug: u.slug || u.id,
      name: displayName(u),
      tagline: u.tagline,
      avatarURL: servableAvatarUrl(u.avatarUrl),
      storyURL: u.storyUrl,
      isMember: u.isMember,
      cohorts,
      updatedAt: u.updatedAt.toISOString(),
      createdAt: u.createdAt.toISOString(),
      strategies: strategies.map((s) => ({
        id: s.id,
        strategyType: s.strategyType,
        // null = not tied to a cohort (= not "certified" in the user-facing
        // sense). 0 is reserved for the seeded Example cohort and still counts.
        cohort: s.cohortRelation?.number ?? null,
      })),
    }
  })
}

/* ---------- /builders/[slug] (Botcamp's /api/members/[slug]) ---------- */

export interface BuilderProfileStrategy {
  id: number
  slug: string
  title: string
  tags: string[]
  exchanges: string[]
  summary: string | null
  videoURL: string | null
  strategyType: BuilderStrategyType
  hasFiles: boolean
  cohort: number | null
}

export interface BuilderProfile {
  id: string
  slug: string
  name: string
  tagline?: string | null
  about?: string | null
  avatarURL?: string | null
  websiteURL?: string | null
  linkedin?: string | null
  github?: string | null
  storyURL?: string | null
  isMember: boolean
  /** When true, only name + strategies + cohorts are populated. */
  isPrivate: boolean
  cohorts: number[]
  strategies: BuilderProfileStrategy[]
}

export async function getBuilderProfile(slug: string): Promise<BuilderProfile | null> {
  // Found by slug or id, no visibility filter at lookup time; the payload is
  // then either "full" or "private" depending on profileVisibility.
  const user = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      slug: true,
      name: true,
      firstName: true,
      lastName: true,
      tagline: true,
      about: true,
      avatarUrl: true,
      websiteUrl: true,
      linkedin: true,
      github: true,
      storyUrl: true,
      isMember: true,
      profileVisibility: true,
      strategies: {
        select: {
          strategy: {
            select: {
              id: true,
              slug: true,
              title: true,
              tags: true,
              exchanges: true,
              summary: true,
              videoURL: true,
              strategyType: true,
              visibility: true,
              agentApprovalRequired: true,
              agentVersions: approvedAgentVersionSelect,
              cohortRelation: { select: { number: true } },
              _count: { select: { files: true } },
            },
          },
        },
      },
      enrollments: {
        where: { cohortId: { not: null } },
        select: { cohort: { select: { number: true } } },
      },
    },
  })
  if (!user) return null

  // Visibility is the only public-vs-private gate for a strategy, matching
  // Botcamp; Strategy.status (DRAFT → … → CERTIFIED) is independent.
  const strategies = user.strategies
    .map((sa) => sa.strategy)
    .filter(
      (s): s is NonNullable<typeof s> =>
        !!s && !isAwaitingAgentApproval(s) && (s.visibility === "PUBLIC" || s.visibility === "MEMBERS_ONLY"),
    )
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      tags: s.tags,
      exchanges: s.exchanges,
      summary: s.summary,
      videoURL: s.videoURL,
      strategyType: s.strategyType,
      hasFiles: s._count.files > 0,
      cohort: s.cohortRelation?.number ?? null,
    }))

  // Cohorts come from enrollments only (not from strategies).
  const cohorts = user.enrollments
    .map((e) => e.cohort?.number)
    .filter((n): n is number => n !== undefined)
    .sort((a, b) => b - a)

  const base = {
    id: user.id,
    slug: user.slug || user.id,
    name: displayName(user),
    isMember: user.isMember,
    cohorts,
    strategies,
  }

  // Private profile: name + strategies + cohort list, nothing else.
  if (isPrivateProfile(user)) return { ...base, isPrivate: true }

  return {
    ...base,
    isPrivate: false,
    tagline: user.tagline,
    about: user.about,
    avatarURL: servableAvatarUrl(user.avatarUrl),
    websiteURL: user.websiteUrl,
    linkedin: user.linkedin,
    github: user.github,
    storyURL: user.storyUrl,
  }
}

/** Botcamp's findMemberMetaBySlug (src/lib/page-meta.ts), for the profile's metadata. */
export async function getBuilderMeta(slug: string) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      slug: true,
      name: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { cohortId: { not: null } },
        select: { cohort: { select: { number: true } } },
      },
      strategies: { select: { strategy: { select: { visibility: true } } } },
    },
  })
  if (!user) return null
  return {
    slug: user.slug || user.id,
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || "Botcamp Builder",
    cohortNumbers: Array.from(
      new Set(user.enrollments.map((e) => e.cohort?.number).filter((n): n is number => n != null)),
    ).sort((a, b) => b - a),
    strategyCount: user.strategies.filter(
      (sa) => sa.strategy?.visibility === "PUBLIC" || sa.strategy?.visibility === "MEMBERS_ONLY",
    ).length,
  }
}

/* ---------- Testimonials (Botcamp fetches /api/members/<slug>) ---------- */

// What Botcamp's /api/members/<slug> gives the testimonial cards: the avatar,
// which a private member profile leaves out.
export async function getTestimonialMembers(): Promise<TestimonialMember[]> {
  const users = await prisma.user.findMany({
    where: { slug: { in: TESTIMONIAL_MEMBER_SLUGS } },
    select: {
      slug: true,
      name: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isMember: true,
      profileVisibility: true,
    },
  })
  return users.map((u) => ({
    slug: u.slug ?? "",
    name: displayName(u),
    avatarURL: isPrivateProfile(u) ? null : u.avatarUrl,
  }))
}
