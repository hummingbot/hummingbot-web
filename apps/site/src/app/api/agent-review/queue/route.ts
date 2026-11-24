import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { reviewerAuth } from "@/botcamp/lib/agent-review"

// The queues the reviewer can read: versions waiting for the AI review, and
// versions the AI approved that wait for an admin's final check.
const QUEUES = { pending: "PENDING", needs_review: "NEEDS_REVIEW" } as const

// GET /api/agent-review/queue?status=pending|needs_review - Agent versions in
// one queue, oldest first, for the external reviewer
// (docs/agent-review-api.md). `needs_review` carries the AI verdict
// (`aiReview`); it is read-only — approving stays an admin's call.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = reviewerAuth(request)
  if (auth === "disabled") return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (auth === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const requested = Number(request.nextUrl.searchParams.get("limit") ?? 20)
    const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 50) : 20

    const queue = request.nextUrl.searchParams.get("status") ?? "pending"
    if (!(queue in QUEUES)) {
      return NextResponse.json({ error: "status must be pending or needs_review" }, { status: 400 })
    }
    const status = QUEUES[queue as keyof typeof QUEUES]

    const versions = await prisma.agentVersion.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        version: true,
        source: true,
        sourceUrl: true,
        sourceRef: true,
        sha256: true,
        fileCount: true,
        manifest: true,
        createdAt: true,
        status: true,
        aiReview: status === "NEEDS_REVIEW",
        strategy: { select: { slug: true, title: true, summary: true } },
      },
    })
    return NextResponse.json({
      data: versions.map(({ createdAt, ...v }) => ({ ...v, uploadedAt: createdAt })),
    })
  } catch (error) {
    console.error("Error listing agent review queue:", error)
    return NextResponse.json({ error: "Failed to list the review queue" }, { status: 500 })
  }
}
