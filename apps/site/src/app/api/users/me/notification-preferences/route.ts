import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAuth,
  unauthorizedResponse,
  badRequestResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"

const PREF_FIELDS = [
  "emailMarketing",
  "emailCourseUpdates",
  "emailStrategyUpdates",
  "emailHackathonUpdates",
] as const

type PrefField = (typeof PREF_FIELDS)[number]

// GET /api/users/me/notification-preferences
export async function GET() {
  try {
    const session = await requireAuth()
    if (!session) return unauthorizedResponse()

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

    return successResponse(prefs)
  } catch (error) {
    console.error("Error fetching notification preferences:", error)
    return serverErrorResponse("Failed to fetch notification preferences")
  }
}

// PATCH /api/users/me/notification-preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!session) return unauthorizedResponse()

    const body = await request.json()

    const data: Partial<Record<PrefField | "newsletterSubscribed", boolean>> = {}
    for (const field of PREF_FIELDS) {
      if (field in body) {
        if (typeof body[field] !== "boolean") {
          return badRequestResponse(`${field} must be a boolean`)
        }
        data[field] = body[field]
      }
    }

    // Newsletter opt-in. Substack bot-blocks programmatic subscribes, so we only
    // record the consent flag here; opted-in users are exported and imported
    // into Substack via the admin CSV export.
    if ("newsletterSubscribed" in body) {
      if (typeof body.newsletterSubscribed !== "boolean") {
        return badRequestResponse("newsletterSubscribed must be a boolean")
      }
      data.newsletterSubscribed = body.newsletterSubscribed
    }

    if (Object.keys(data).length === 0) {
      return badRequestResponse("No valid preference fields provided")
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        emailMarketing: true,
        emailCourseUpdates: true,
        emailStrategyUpdates: true,
        emailHackathonUpdates: true,
        newsletterSubscribed: true,
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return serverErrorResponse("Failed to update notification preferences")
  }
}
