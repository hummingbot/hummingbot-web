import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/preview-session"
import { ProfileTabs } from "@/botcamp/components/profile/ProfileTabs"
import { getEffectiveMembership } from "@/botcamp/lib/utils"

// Botcamp's getLatestStrategyGrant (lib/strategy-access): the newest grant,
// whatever its status, for the billing tab. Not in this site's trimmed copy.
function getLatestStrategyGrant(userId: string) {
  return prisma.strategyAccessGrant.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
}

// What Botcamp's Condor tab fetches from /api/user/api-tokens (never the token).
function getCondorConnections(userId: string) {
  return prisma.apiToken.findMany({
    where: { userId },
    select: { id: true, name: true, scopes: true, expiresAt: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
}

export const metadata = {
  title: "Profile - Dashboard - Botcamp",
}

async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      image: true,
      avatarUrl: true, // OAuth profile pictures are saved here
      slug: true,
      tagline: true,
      location: true,
      about: true,
      websiteUrl: true,
      linkedin: true,
      github: true,
      discord: true,
      storyUrl: true,
      role: true,
      isMember: true,
      profileVisibility: true,
      avatarMimeType: true, // Check if avatar exists
      createdAt: true,
      enrollments: {
        select: {
          id: true,
          enrolledAt: true,
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          cohort: {
            select: {
              id: true,
              number: true,
              title: true,
            },
          },
        },
      },
      strategies: {
        select: {
          strategy: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  })

  if (!user) return null

  // Count certified strategies
  const certifiedCount = user.strategies.filter(
    (s) => s.strategy.status === "CERTIFIED"
  ).length

  // Check if user has any cohort enrollments
  const hasCohortEnrollment = user.enrollments.some((e) => e.cohort !== null)

  // Transform for ProfileEditor
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
    avatarUrl: user.avatarUrl, // Include OAuth profile picture
    slug: user.slug,
    tagline: user.tagline,
    location: user.location,
    about: user.about,
    websiteUrl: user.websiteUrl,
    linkedin: user.linkedin,
    github: user.github,
    discord: user.discord,
    storyUrl: user.storyUrl,
    profileVisibility: user.profileVisibility,
    hasAvatar: !!user.avatarMimeType,
    createdAt: user.createdAt.toISOString(),
    enrollments: user.enrollments.map((e) => ({
      id: e.id,
      enrolledAt: e.enrolledAt.toISOString(),
      course: e.course,
      cohort: e.cohort,
    })),
    _count: {
      strategies: certifiedCount,
    },
    isMember: getEffectiveMembership(user).isMember || hasCohortEnrollment,
  }
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  const user = await getUserProfile(session.user.id)

  if (!user) {
    notFound()
  }

  const prefs = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailMarketing: true,
      emailCourseUpdates: true,
      emailStrategyUpdates: true,
      emailHackathonUpdates: true,
      newsletterSubscribed: true,
    },
  })

  if (!prefs) {
    notFound()
  }

  const [grant, condorTokens] = await Promise.all([
    getLatestStrategyGrant(session.user.id),
    getCondorConnections(session.user.id),
  ])

  return (
    <div className="space-y-bc-6">
      <ProfileTabs
        user={user}
        canEditVisibility={user.isMember}
        initialTab={(await searchParams).tab}
        condorConnections={condorTokens.map((t) => ({
          ...t,
          expiresAt: t.expiresAt?.toISOString() ?? null,
          lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
          createdAt: t.createdAt.toISOString(),
        }))}
        notificationPrefs={prefs}
        strategyGrant={
          grant
            ? {
                status: grant.status,
                cancelAtPeriodEnd: grant.cancelAtPeriodEnd,
                expiresAt: grant.expiresAt?.toISOString() ?? null,
                stripeCustomerId: grant.stripeCustomerId,
              }
            : null
        }
      />
    </div>
  )
}
