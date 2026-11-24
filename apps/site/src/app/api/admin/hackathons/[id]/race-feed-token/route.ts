import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { generateRaceFeedToken } from "@/botcamp/lib/race-feed"
import { notFoundResponse, requireAdmin, serverErrorResponse, successResponse, unauthorizedResponse } from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/hackathons/[id]/race-feed-token - Generate (or replace) the race feed token
// The token is in this response only; the hackathon stores its digest, and
// any previous token stops working immediately.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const { token, hash } = generateRaceFeedToken()
    const { count } = await prisma.hackathon.updateMany({
      where: { id },
      data: { raceFeedTokenHash: hash, raceFeedTokenCreatedAt: new Date() },
    })
    if (count === 0) return notFoundResponse("Hackathon not found")

    const response = successResponse({ token })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("Error generating race feed token:", error)
    return serverErrorResponse("Failed to generate the race feed token")
  }
}

// DELETE /api/admin/hackathons/[id]/race-feed-token - Revoke it: the feed answers 404 until a new one is generated
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const { count } = await prisma.hackathon.updateMany({
      where: { id },
      data: { raceFeedTokenHash: null, raceFeedTokenCreatedAt: null },
    })
    if (count === 0) return notFoundResponse("Hackathon not found")
    return successResponse({ revoked: true })
  } catch (error) {
    console.error("Error revoking race feed token:", error)
    return serverErrorResponse("Failed to revoke the race feed token")
  }
}
