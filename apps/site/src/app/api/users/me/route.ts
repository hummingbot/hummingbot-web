import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { geocodeLocation } from "@/botcamp/lib/geocode"
import {
  requireAuth,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"
import { isJsonObject, unsafeProfileLink } from "@/botcamp/lib/validation"

// GET /api/users/me - Get current user profile
export async function GET() {
  try {
    const session = await requireAuth()
    if (!session) return unauthorizedResponse()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        image: true,
        tagline: true,
        location: true,
        about: true,
        websiteUrl: true,
        linkedin: true,
        github: true,
        discord: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return notFoundResponse("User not found")
    }

    return successResponse(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return serverErrorResponse("Failed to fetch user")
  }
}

// PATCH /api/users/me - Update current user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!session) return unauthorizedResponse()

    const body = await request.json()

    // `null`, `1` or `[]` parse fine but aren't a profile: a 400, not a TypeError
    if (!isJsonObject(body)) return badRequestResponse("Request body must be a JSON object")

    // Validate required fields - firstName and lastName cannot be empty
    if ("firstName" in body && (!body.firstName || !body.firstName.trim())) {
      return badRequestResponse("First name is required")
    }
    if ("lastName" in body && (!body.lastName || !body.lastName.trim())) {
      return badRequestResponse("Last name is required")
    }

    // Validate slug if provided
    if ("slug" in body && body.slug) {
      const normalizedSlug = body.slug.trim().toLowerCase()

      // Validate slug format (alphanumeric and hyphens only, 3-30 chars)
      const slugRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
      if (!slugRegex.test(normalizedSlug)) {
        return badRequestResponse(
          "Username must be 3-30 characters, start and end with a letter or number, and contain only letters, numbers, or hyphens"
        )
      }

      // Check if slug is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          slug: normalizedSlug,
          id: { not: session.user.id },
        },
      })

      if (existingUser) {
        return badRequestResponse("This username is already taken")
      }
    }

    // Profile links render as hrefs: http(s) or a bare handle only
    const badLink = unsafeProfileLink(body)
    if (badLink) return badRequestResponse(`${badLink} must be a web address (http:// or https://) or a handle`)

    // Only allow updating specific fields
    const allowedFields = [
      "firstName",
      "lastName",
      "slug",
      "tagline",
      "location",
      "about",
      "websiteUrl",
      "linkedin",
      "github",
      "discord",
      "profileVisibility",
    ]

    const updateData: Record<string, string | boolean | number | null> = {}
    for (const field of allowedFields) {
      if (field in body) {
        // firstName and lastName are required and validated above, don't convert to null
        if (field === "firstName" || field === "lastName") {
          updateData[field] = body[field].trim()
        } else if (field === "slug") {
          updateData[field] = body[field] ? body[field].trim().toLowerCase() : null
        } else {
          updateData[field] = body[field] === "" ? null : body[field]
        }
      }
    }

    // Re-geocode when the location text changes so the builder map stays current.
    if ("location" in updateData) {
      const current = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { location: true },
      })
      const nextLocation = updateData.location as string | null
      if (nextLocation !== current?.location) {
        const point = nextLocation ? await geocodeLocation(nextLocation) : null
        updateData.latitude = point?.latitude ?? null
        updateData.longitude = point?.longitude ?? null
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        image: true,
        tagline: true,
        location: true,
        about: true,
        websiteUrl: true,
        linkedin: true,
        github: true,
        discord: true,
      },
    })

    return successResponse(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return serverErrorResponse("Failed to update user")
  }
}
