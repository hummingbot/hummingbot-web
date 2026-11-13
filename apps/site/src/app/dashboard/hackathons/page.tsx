import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { auth } from "@/botcamp/lib/preview-session"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { Trophy } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "My Hackathons - Dashboard - Botcamp",
}

/**
 * Resolves the current hackathon and redirects into its racing hub —
 * same "go to the live one" behaviour as the public /hackathons index.
 */
async function getCurrentHackathonSlug(): Promise<string | null> {
  const live = await prisma.hackathon.findFirst({
    where: { status: { in: CURRENT_HACKATHON_STATUSES } },
    orderBy: { startDate: "desc" },
    select: { slug: true },
  })
  if (live) return live.slug

  const latest = await prisma.hackathon.findFirst({
    where: { status: { not: "DRAFT" } },
    orderBy: { startDate: "desc" },
    select: { slug: true },
  })
  return latest?.slug ?? null
}

export default async function DashboardHackathonsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    notFound()
  }

  const slug = await getCurrentHackathonSlug()
  if (slug) {
    redirect(`/dashboard/hackathons/${slug}`)
  }

  return (
    <div className="space-y-bc-8">
      <PageHeader title="Hackathons" variant="admin" />
      <div className="rounded-bc-xl border border-border bg-card">
        <EmptyState
          icon={Trophy}
          title="No hackathons yet"
          description="There's no active hackathon right now — check back soon for the next Agent Builders Cup."
        />
      </div>
    </div>
  )
}
