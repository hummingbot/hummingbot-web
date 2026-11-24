import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { isRegistrationOpen } from "@/botcamp/lib/hackathon-stages"
import { auth } from "@/botcamp/lib/auth"
import { geocodeLocation } from "@/botcamp/lib/geocode"
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// POST /api/hackathons/[slug]/register - Register for hackathon
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { slug } = await params

    // Get hackathon
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        status: true,
        teamIds: true,
        registrationEnd: true,
      },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    // The stage gates registration; registrationEnd closes it past the deadline
    if (!isRegistrationOpen(hackathon)) {
      return badRequestResponse(
        hackathon.status === "REGISTRATION"
          ? "Registration is closed for this hackathon"
          : "Registration is not open for this hackathon"
      )
    }

    // Block registration past the submission deadline
    if (hackathon.registrationEnd && new Date() > hackathon.registrationEnd) {
      return badRequestResponse("Registration is closed for this hackathon")
    }

    // Parse body
    const body = await request.json()
    const { agentDescription, location, sponsorTeamId: rawSponsor, agreedToTerms } = body

    if (agentDescription !== undefined && typeof agentDescription !== "string") {
      return badRequestResponse("Agent description must be a string")
    }

    if (agreedToTerms !== true) {
      return badRequestResponse("You must agree to the terms and conditions to register")
    }

    // Optional sponsor — must be one of this hackathon's teams when present.
    let sponsorTeamId: string | null = null
    if (rawSponsor !== undefined && rawSponsor !== null && rawSponsor !== "") {
      if (typeof rawSponsor !== "string" || !hackathon.teamIds.includes(rawSponsor)) {
        return badRequestResponse("Invalid sponsor selection")
      }
      sponsorTeamId = rawSponsor
    }

    const locationValue =
      typeof location === "string" && location.trim() ? location.trim() : undefined
    const geoPoint = locationValue ? await geocodeLocation(locationValue) : null

    // Check if already registered
    const existingEntry = await prisma.hackathonEntry.findUnique({
      where: {
        hackathonId_userId: {
          hackathonId: hackathon.id,
          userId: session.user.id,
        },
      },
    })

    if (existingEntry) {
      return conflictResponse("You are already registered for this hackathon")
    }

    // Create entry and set profile to public in a transaction
    const entry = await prisma.$transaction(async (tx) => {
      // Create hackathon entry
      const newEntry = await tx.hackathonEntry.create({
        data: {
          hackathonId: hackathon.id,
          userId: session.user.id,
          strategyDescription: agentDescription?.trim() || null,
          sponsorTeamId,
          agreedToTermsAt: new Date(),
          status: "REGISTERED",
        },
      })

      // Set user profile to public; capture location if provided
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          profileVisibility: "PUBLIC",
          ...(locationValue
            ? {
                location: locationValue,
                latitude: geoPoint?.latitude ?? null,
                longitude: geoPoint?.longitude ?? null,
              }
            : {}),
        },
      })

      return newEntry
    })

    return createdResponse({
      id: entry.id,
      message: "Successfully registered for hackathon",
    })
  } catch (error) {
    console.error("Error registering for hackathon:", error)
    return serverErrorResponse("Failed to register for hackathon")
  }
}

// PATCH /api/hackathons/[slug]/register - Update your own agent idea
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { slug } = await params

    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true, teamIds: true, status: true, registrationEnd: true },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    // The idea and sponsor feed what teams review and their registrant counts,
    // so they lock when registration closes.
    if (!isRegistrationOpen(hackathon)) {
      return badRequestResponse("Registration is closed — your entry can no longer be changed")
    }

    const body = await request.json()

    // Both fields are optional on PATCH — update whichever is provided.
    const data: { strategyDescription?: string; sponsorTeamId?: string | null } = {}

    if (body.agentDescription !== undefined) {
      if (typeof body.agentDescription !== "string") {
        return badRequestResponse("Agent description must be a string")
      }
      data.strategyDescription = body.agentDescription.trim()
    }

    if (body.sponsorTeamId !== undefined) {
      const s = body.sponsorTeamId
      if (s === null || s === "") {
        data.sponsorTeamId = null
      } else if (typeof s === "string" && hackathon.teamIds.includes(s)) {
        data.sponsorTeamId = s
      } else {
        return badRequestResponse("Invalid sponsor selection")
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequestResponse("Nothing to update")
    }

    // Must already be registered to edit
    const existingEntry = await prisma.hackathonEntry.findUnique({
      where: {
        hackathonId_userId: {
          hackathonId: hackathon.id,
          userId: session.user.id,
        },
      },
      select: { id: true },
    })

    if (!existingEntry) {
      return notFoundResponse("You are not registered for this hackathon")
    }

    const updated = await prisma.hackathonEntry.update({
      where: { id: existingEntry.id },
      data,
      select: { id: true, strategyDescription: true, sponsorTeamId: true },
    })

    return successResponse({
      id: updated.id,
      agentDescription: updated.strategyDescription,
      sponsorTeamId: updated.sponsorTeamId,
    })
  } catch (error) {
    console.error("Error updating hackathon registration:", error)
    return serverErrorResponse("Failed to update registration")
  }
}

// GET /api/hackathons/[slug]/register - Check registration status
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { slug } = await params

    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!hackathon) {
      return notFoundResponse("Hackathon not found")
    }

    const entry = await prisma.hackathonEntry.findUnique({
      where: {
        hackathonId_userId: {
          hackathonId: hackathon.id,
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        strategyDescription: true,
        createdAt: true,
      },
    })

    return successResponse({
      isRegistered: !!entry,
      registration: entry
        ? {
            id: entry.id,
            agentDescription: entry.strategyDescription,
            createdAt: entry.createdAt,
          }
        : null,
    })
  } catch (error) {
    console.error("Error checking registration:", error)
    return serverErrorResponse("Failed to check registration status")
  }
}
