import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"

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

  return <>{children}</>
}
