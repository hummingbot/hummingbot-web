import { redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"

// Always resolve the current hackathon at request time
export const dynamic = "force-dynamic"

// Redirects to the current hackathon. Prefers a live (REGISTRATION/ACTIVE)
// hackathon, then falls back to the most recently started published one, and
// finally to the hackathons listing if none exist yet.
export default async function ActiveHackathonPage() {
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

  redirect(latest ? `/hackathons/${latest.slug}` : "/hackathons")
}
