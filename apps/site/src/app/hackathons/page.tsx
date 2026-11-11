import { redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"

// Always resolve the current hackathon at request time
export const dynamic = "force-dynamic"

// Redirects to the current hackathon. Prefers a live (REGISTRATION/ACTIVE)
// hackathon, then falls back to the most recently started published one, and
// finally renders a minimal placeholder if none exist yet.
export default async function HackathonsIndexPage() {
  const live = await prisma.hackathon.findFirst({
    where: { status: { in: CURRENT_HACKATHON_STATUSES } },
    orderBy: { startDate: "desc" },
    select: { slug: true },
  })

  if (live) {
    redirect(`/hackathons/${live.slug}`)
  }

  const latest = await prisma.hackathon.findFirst({
    where: { status: { not: "DRAFT" } },
    orderBy: { startDate: "desc" },
    select: { slug: true },
  })

  if (latest) {
    redirect(`/hackathons/${latest.slug}`)
  }

  // No hackathons to redirect to — render a tiny placeholder rather than 404
  // so the navbar link still feels alive.
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">No hackathons yet — check back soon.</p>
    </div>
  )
}
