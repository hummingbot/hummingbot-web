import { prisma } from "@/botcamp/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { ProfileEditor } from "@/botcamp/components/profile/ProfileEditor"
import { CreateUserForm } from "@/botcamp/components/admin/CreateUserForm"
import { getActiveStrategyGrant } from "@/botcamp/lib/strategy-access"
import { requireAdmin } from "@/botcamp/lib/api-utils"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getUser(id: string) {
  if (id === "new") return null

  const [user, strategyAccessGrant] = await Promise.all([
    prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      slug: true,
      tagline: true,
      location: true,
      about: true,
      avatarUrl: true,
      avatarMimeType: true,
      profileVisibility: true,
      websiteUrl: true,
      linkedin: true,
      github: true,
      discord: true,
      storyUrl: true,
      createdAt: true,
      enrollments: {
        select: {
          id: true,
          enrolledAt: true,
          course: {
            select: { id: true, title: true },
          },
          cohort: {
            select: { id: true, number: true, title: true },
          },
        },
        orderBy: { enrolledAt: "desc" },
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
    }),
    getActiveStrategyGrant(id),
  ])

  if (!user) return null

  // Count certified strategies
  const certifiedCount = user.strategies.filter(
    (s) => s.strategy.status === "CERTIFIED"
  ).length

  // Serialize dates for client component
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    slug: user.slug,
    tagline: user.tagline,
    location: user.location,
    about: user.about,
    avatarUrl: user.avatarUrl,
    hasAvatar: !!user.avatarMimeType,
    profileVisibility: user.profileVisibility,
    websiteUrl: user.websiteUrl,
    linkedin: user.linkedin,
    github: user.github,
    discord: user.discord,
    storyUrl: user.storyUrl,
    createdAt: user.createdAt.toISOString(),
    enrollments: user.enrollments.map((e) => ({
      ...e,
      enrolledAt: e.enrolledAt.toISOString(),
    })),
    strategyAccessGrant: strategyAccessGrant
      ? {
          ...strategyAccessGrant,
          expiresAt: strategyAccessGrant.expiresAt?.toISOString() ?? null,
          purchasedAt: strategyAccessGrant.purchasedAt.toISOString(),
        }
      : null,
    _count: {
      strategies: certifiedCount,
    },
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params

  if (id === "new") {
    return { title: "Create User - Admin - Botcamp" }
  }

  const user = await getUser(id)
  if (!user) {
    return { title: "User Not Found - Admin - Botcamp" }
  }

  return {
    title: `Edit ${user.firstName} ${user.lastName} - Admin - Botcamp`,
  }
}

export default async function AdminUserEditPage({ params }: PageProps) {
  // Admins only: the admin layout also lets instructors in
  if (!(await requireAdmin())) redirect("/admin/courses")
  const { id } = await params

  if (id === "new") {
    return <CreateUserForm />
  }

  const user = await getUser(id)

  if (!user) {
    notFound()
  }

  return (
    <ProfileEditor
      user={user}
      isAdmin
      backHref="/admin/users"
      backLabel="Back to Users"
    />
  )
}
