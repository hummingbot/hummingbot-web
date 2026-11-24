import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string; id: string }>
}

async function getApplicationInHackathon(slug: string, id: string) {
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!hackathon) return { hackathon: null, application: null }

  const application = await prisma.application.findUnique({ where: { id } })
  if (!application || application.hackathonId !== hackathon.id) {
    return { hackathon, application: null }
  }

  return { hackathon, application }
}

// PUT /api/hackathons/[slug]/applications/[id]/score - Set the current admin's
// own 1-10 review score on this application (upsert)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return unauthorizedResponse()
    }

    const { slug, id } = await params
    const body = await parseBody<{ score?: number }>(request)
    if (!body || body.score === undefined) {
      return badRequestResponse("Invalid request body")
    }

    if (!Number.isInteger(body.score) || body.score < 1 || body.score > 10) {
      return badRequestResponse("Score must be an integer between 1 and 10")
    }

    const { application } = await getApplicationInHackathon(slug, id)
    if (!application) {
      return notFoundResponse("Application not found")
    }

    const score = await prisma.applicationScore.upsert({
      where: { applicationId_adminId: { applicationId: id, adminId: session.user.id } },
      update: { score: body.score },
      create: { applicationId: id, adminId: session.user.id, score: body.score },
    })

    return successResponse(score)
  } catch (error) {
    console.error("Error setting application score:", error)
    return serverErrorResponse("Failed to set score")
  }
}

// DELETE /api/hackathons/[slug]/applications/[id]/score - Remove the current
// admin's own score from this application
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return unauthorizedResponse()
    }

    const { slug, id } = await params
    const { application } = await getApplicationInHackathon(slug, id)
    if (!application) {
      return notFoundResponse("Application not found")
    }

    await prisma.applicationScore.deleteMany({
      where: { applicationId: id, adminId: session.user.id },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Error removing application score:", error)
    return serverErrorResponse("Failed to remove score")
  }
}
