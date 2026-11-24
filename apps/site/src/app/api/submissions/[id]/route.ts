import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { getAgentRequestUser } from "@/botcamp/lib/api-tokens"
import type { AgentReviewRecord } from "@/botcamp/lib/agent-review"
import { submissionView } from "@/botcamp/lib/condor-publish"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/submissions/[id] - Where a Condor publish stands (condor/hub.py
// `submission_status`, contract §5.3): pending through the AI review and the
// admin's check, then published or rejected. Only its uploader (or an admin)
// may read it — 403 for anyone else, so "not yours" reads differently from
// "never existed". Bare shapes, like POST /api/agents.
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getAgentRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: "Sign in required — connect Condor to Botcamp, then try again" }, { status: 401 })
    }

    const { id } = await params
    const version = await prisma.agentVersion.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        reviewNote: true,
        aiReview: true,
        uploadedById: true,
        strategy: { select: { slug: true } },
      },
    })
    if (!version) {
      return NextResponse.json({ error: "No such submission" }, { status: 404 })
    }
    if (version.uploadedById !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "This submission isn't yours" }, { status: 403 })
    }

    const review = version.aiReview as AgentReviewRecord | null
    return NextResponse.json(
      submissionView({
        id: version.id,
        status: version.status,
        createdAt: version.createdAt,
        reviewedAt: version.reviewedAt,
        reviewNote: version.reviewNote,
        // Only a rejection's feedback is the author's to see (as on the website).
        authorFeedback: version.status === "REJECTED" ? (review?.authorFeedback ?? []) : [],
        listingId: version.strategy.slug,
      }),
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Error reading submission:", error)
    return NextResponse.json({ error: "Failed to read submission" }, { status: 500 })
  }
}
