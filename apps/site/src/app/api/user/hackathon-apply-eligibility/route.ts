import { prisma } from "@/botcamp/lib/prisma"
import { requireAuth, successResponse, unauthorizedResponse, withErrorHandling } from "@/botcamp/lib/api-utils"
import { MAX_APPLICATIONS_PER_HACKATHON } from "@/botcamp/lib/hackathon-squads"

export interface HackathonApplyEligibility {
  hackathon: { slug: string; title: string } | null
}

// GET /api/user/hackathon-apply-eligibility
// Tells the strategy editor whether the current user has an open hackathon
// they're registered for and can still apply a strategy to — so it can
// offer an "Apply to Hackathon" prompt right after a strategy is finished,
// instead of leaving that as a separate step the user has to find on their own.
export const GET = withErrorHandling(async () => {
  const session = await requireAuth()
  if (!session?.user?.id) return unauthorizedResponse()
  const userId = session.user.id

  const hackathon = await prisma.hackathon.findFirst({
    where: {
      // Same rule as isRegistrationOpen(): the Open stage, before the deadline.
      status: "REGISTRATION",
      OR: [{ registrationEnd: null }, { registrationEnd: { gte: new Date() } }],
    },
    orderBy: { startDate: "desc" },
    select: { id: true, slug: true, title: true },
  })

  if (!hackathon) {
    return successResponse<HackathonApplyEligibility>({ hackathon: null })
  }

  const entry = await prisma.hackathonEntry.findUnique({
    where: { hackathonId_userId: { hackathonId: hackathon.id, userId } },
  })
  if (!entry) {
    return successResponse<HackathonApplyEligibility>({ hackathon: null })
  }

  const applicationCount = await prisma.application.count({
    where: { hackathonId: hackathon.id, userId },
  })
  if (applicationCount >= MAX_APPLICATIONS_PER_HACKATHON) {
    return successResponse<HackathonApplyEligibility>({ hackathon: null })
  }

  return successResponse<HackathonApplyEligibility>({
    hackathon: { slug: hackathon.slug, title: hackathon.title },
  })
}, "Failed to check hackathon apply eligibility")
