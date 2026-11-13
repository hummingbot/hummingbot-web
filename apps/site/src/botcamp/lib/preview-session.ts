import "server-only"
import { cache } from "react"
import { prisma } from "@/botcamp/lib/prisma"

// Read-only /dashboard preview. Botcamp's pages read the signed-in user from
// NextAuth's auth(); this site has no login, so the dashboard runs "as" the
// Botcamp user named by DASHBOARD_PREVIEW_USER (an email), and only in
// development. src/app/dashboard/layout.tsx 404s every route otherwise.
// Nothing here can write: the Prisma client refuses writes.

export interface PreviewSession {
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
    role: string
    isMember: boolean
  }
}

/** The preview is on only in development, with DASHBOARD_PREVIEW_USER set. */
export function isDashboardPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !!process.env.DASHBOARD_PREVIEW_USER?.trim()
}

/**
 * The session-shaped preview user, or null when the preview is off or the
 * configured email isn't a Botcamp user. Drop-in for Botcamp's `auth()`.
 */
export const auth = cache(async (): Promise<PreviewSession | null> => {
  if (!isDashboardPreviewEnabled()) return null
  const email = process.env.DASHBOARD_PREVIEW_USER!.trim().toLowerCase()
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, name: true, firstName: true, lastName: true, avatarUrl: true, role: true, isMember: true },
  })
  if (!user) return null
  const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || null
  return {
    user: {
      id: user.id,
      email: user.email,
      name,
      image: user.avatarUrl,
      role: user.role,
      isMember: user.isMember,
    },
  }
})
