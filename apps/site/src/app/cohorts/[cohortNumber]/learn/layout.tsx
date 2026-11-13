import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { PreviewChrome } from "@/botcamp/components/layout/PreviewChrome"

// Botcamp's cohort learn pages, ported as a READ-ONLY local preview (see
// PreviewChrome): a 404 in production or without DASHBOARD_PREVIEW_USER.
// The rest of /cohorts (overview, landing, recap, schedule) is public.

export const dynamic = "force-dynamic"

export const metadata = {
  robots: { index: false, follow: false },
}

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ cohortNumber: string }>
}

/**
 * Cohort learn-route gate.
 *
 * We deliberately do NOT redirect non-enrolled users back to the
 * overview — that surprised users who clicked a sidebar lesson and
 * got bounced. The lesson page itself handles access (renders an
 * in-place `LessonAccessDenied` CTA wrapped in the LearnShell so the
 * sidebar stays visible).
 */
export default async function CohortLearnLayout({
  children,
  params,
}: LayoutProps) {
  const { cohortNumber: cohortNumberStr } = await params
  const cohortNumber = parseInt(cohortNumberStr.replace("cohort", ""))
  if (isNaN(cohortNumber)) notFound()

  const cohort = await prisma.cohort.findUnique({
    where: { number: cohortNumber },
    select: { id: true },
  })
  if (!cohort) notFound()

  return <PreviewChrome>{children}</PreviewChrome>
}
