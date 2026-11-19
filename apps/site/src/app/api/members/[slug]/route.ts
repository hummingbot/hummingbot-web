import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { approvedAgentVersionSelect, isAwaitingAgentApproval, PUBLISHED_STRATEGY_WHERE } from "@/botcamp/lib/strategy-access"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Find user by slug or id — no visibility filter at lookup time. We always
  // resolve the user; the response payload is then either "full" or "private"
  // depending on the member's profileVisibility.
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    include: {
      strategies: {
        // A public profile lists published strategies only — not drafts or
        // ones still in review, and not PRIVATE ones.
        where: { strategy: { ...PUBLISHED_STRATEGY_WHERE, visibility: { not: "PRIVATE" } } },
        include: {
          strategy: {
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
              agentVersions: approvedAgentVersionSelect,
              authors: {
                // strategyType is read off the top-level strategy include
                // below — keep the authors include lean

                include: {
                  user: {
                    select: {
                      id: true,
                      slug: true,
                      name: true,
                      firstName: true,
                      lastName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      enrollments: {
        where: {
          cohortId: { not: null },
        },
        select: {
          cohort: {
            select: {
              number: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  // The query already kept published, non-PRIVATE strategies (certified, a
  // hackathon entry or an approved agent), cohort or not.
  const visibleStrategies = user.strategies.filter(
    (sa) =>
      sa.strategy &&
      !isAwaitingAgentApproval(sa.strategy) &&
      (sa.strategy.visibility === "PUBLIC" || sa.strategy.visibility === "MEMBERS_ONLY")
  )

  // Get cohorts from enrollments only (not from strategies)
  const cohorts = user.enrollments
    .map((e) => e.cohort?.number)
    .filter((n): n is number => n !== undefined)
    .sort((a, b) => b - a)

  const strategies = visibleStrategies.map((sa) => ({
    id: sa.strategy!.id,
    slug: sa.strategy!.slug,
    title: sa.strategy!.title,
    tags: sa.strategy!.tags,
    exchanges: sa.strategy!.exchanges,
    summary: sa.strategy!.summary,
    videoURL: sa.strategy!.videoURL,
    strategyType: sa.strategy!.strategyType,
    hasFiles: sa.strategy!.files.length > 0,
    cohort: sa.strategy!.cohortRelation?.number ?? null,
    students: sa.strategy!.authors.map((author) => ({
      id: author.user.id,
      slug: author.user.slug || author.user.id,
      name:
        author.user.name ||
        `${author.user.firstName || ""} ${author.user.lastName || ""}`.trim() ||
        "Anonymous",
      avatarURL: author.user.avatarUrl,
    })),
  }))

  // Private profile: show first/last name + strategies + cohort list, nothing
  // else. Whoever set it, member or not: a member who chose Private and then
  // lost membership used to have their links, about and tagline shown again.
  const isPrivateProfile = user.profileVisibility !== "PUBLIC"

  if (isPrivateProfile) {
    const member = {
      id: user.id,
      slug: user.slug || user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name:
        user.name ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "Anonymous",
      isMember: user.isMember,
      isPrivate: true as const,
      cohorts,
      strategies,
    }
    return NextResponse.json({ data: member })
  }

  // Full profile (PUBLIC member or non-member with direct link).
  // Note: email is intentionally not exposed — it's not rendered anywhere and
  // shouldn't leak via the API to scrapers.
  const member = {
    id: user.id,
    slug: user.slug || user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name:
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "Anonymous",
    tagline: user.tagline,
    about: user.about,
    avatarURL: user.avatarUrl,
    websiteURL: user.websiteUrl,
    linkedin: user.linkedin,
    github: user.github,
    discord: user.discord,
    storyURL: user.storyUrl,
    isMember: user.isMember,
    isPrivate: false as const,
    cohorts,
    strategies,
  }

  return NextResponse.json({ data: member })
}
