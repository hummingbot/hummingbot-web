import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { requireAdmin, unauthorizedResponse, badRequestResponse, notFoundResponse, serverErrorResponse } from "@/botcamp/lib/api-utils"
import { sendAgentVersionStatusEmail } from "@/botcamp/lib/notifications"

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ReviewBody {
  action?: "approve" | "reject" | "rerun"
  note?: string
}

// PATCH /api/admin/agent-versions/[id] - An admin's decision on an agent
// version: approve it (only once the AI review passed it), reject it (at any
// point, which revokes an approved one), or send it back to the AI review queue. Approve/reject record
// who decided and why; the note is what the author sees. An agent's first
// approval also publishes its page: agents start private (from the Create
// Condor Agent flow or Condor's publish), and an approved agent on a private
// page is one nobody else can clone. Only the first — after that the
// visibility is the author's (they may have hidden it, or withdrawn it from
// Condor), so later approvals leave it alone.
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const { action, note } = (await request.json().catch(() => ({}))) as ReviewBody
    const reviewNote = typeof note === "string" && note.trim() ? note.trim().slice(0, 2000) : null

    const version = await prisma.agentVersion.findUnique({
      where: { id },
      select: { id: true, strategyId: true, status: true },
    })
    if (!version) return notFoundResponse("Agent version not found")

    if (action === "rerun") {
      // Back in the queue the external reviewer polls; the old verdict goes so
      // the next one is recorded fresh.
      await prisma.agentVersion.update({
        where: { id },
        data: { status: "PENDING", aiReview: Prisma.DbNull, reviewedById: null, reviewedAt: null, reviewNote: null },
      })
      return NextResponse.json({ data: { id, status: "PENDING" } })
    }

    if (action !== "approve" && action !== "reject") {
      return badRequestResponse("action must be approve, reject, or rerun")
    }
    if (action === "reject" && !reviewNote) {
      return badRequestResponse("Say why it's rejected — the author sees this note")
    }

    // Every version — a new agent's first or an approved agent's tenth — goes
    // through the AI review, then an admin. Approving is only the final check
    // on what the AI passed: a version still waiting for it, or one it
    // rejected, can't be approved over it (send it back to the AI instead).
    if (action === "approve" && version.status !== "NEEDS_REVIEW") {
      return NextResponse.json(
        {
          error:
            version.status === "APPROVED"
              ? "This version is already approved"
              : "Only a version the AI review passed can be approved — send it back to the AI review first",
        },
        { status: 409 },
      )
    }

    // Conditional on the status read above, so a rerun or a second admin
    // landing in between can't be overwritten (P2025 → 409 below).
    const updated = await prisma.agentVersion.update({
      where: { id, status: version.status },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNote,
      },
      select: { id: true, status: true, reviewedAt: true, reviewNote: true },
    })
    if (action === "approve") {
      const approvedBefore = await prisma.agentVersion.count({
        where: { strategyId: version.strategyId, status: "APPROVED", id: { not: id } },
      })
      // Counts versions approved now, not ever: rejecting or rerunning an
      // agent's only approved version and then approving it again publishes
      // the page again, even if its author made it private in between. After
      // reverting an approval, check the page's visibility.
      if (approvedBefore === 0) {
        // Only PRIVATE: a members-only page stays members-only.
        await prisma.strategy.updateMany({
          where: { id: version.strategyId, visibility: "PRIVATE" },
          data: { visibility: "PUBLIC" },
        })
      }
    }
    await sendAgentVersionStatusEmail(id).catch((err) =>
      console.error(`Failed to send agent version email for ${id}:`, err),
    )
    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "This version changed while you were deciding — reload it" }, { status: 409 })
    }
    console.error("Error reviewing agent version:", error)
    return serverErrorResponse("Failed to update agent version")
  }
}
