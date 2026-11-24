import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { raceDataBlocksDelete } from "@/botcamp/lib/race-data-guard"
import { canAuthorDeleteStrategy } from "@/botcamp/lib/strategy-limits"
import { canEditWithState, getHackathonEditState } from "@/botcamp/lib/strategy-edit"
import { sendStrategyStatusEmail } from "@/botcamp/lib/notifications"
import { getExistingValues, resolveToExisting } from "@/botcamp/lib/strategy-tags"
import { generateUniqueSlug } from "@/botcamp/lib/slug"
import { strategyInputError } from "@/botcamp/lib/strategy-input"
import type { StrategyStatus } from "@prisma/client"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const strategyId = parseInt(id)

    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Verify user is an author of this strategy
    const authorCheck = await prisma.strategyAuthor.findUnique({
      where: {
        userId_strategyId: {
          userId: session.user.id,
          strategyId,
        },
      },
    })

    if (!authorCheck) {
      return NextResponse.json(
        { error: "You are not an author of this strategy" },
        { status: 403 }
      )
    }

    const data = await request.json()

    // Get current strategy to check status
    const currentStrategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      select: {
        status: true,
        visibility: true,
        title: true,
        videoURL: true,
        agentApprovalRequired: true,
        strategyType: true,
        agentVersions: { where: { status: "APPROVED" }, select: { id: true }, take: 1 },
      },
    })

    if (!currentStrategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    const inputError = strategyInputError(data, currentStrategy.videoURL)
    if (inputError) {
      return NextResponse.json({ error: inputError }, { status: 400 })
    }

    const { title, summary, details, strategyType, tags, exchanges, videoURL, visibility, submitForReview, certify } = data

    // A non-member may only hold an AGENT page, reviewed per agent version.
    // Switching its type or sending it to the strategy review queue would get
    // around the rule that only members and hackathon builders create strategies.
    if (currentStrategy.agentApprovalRequired) {
      if (strategyType !== undefined && strategyType !== "AGENT") {
        return NextResponse.json({ error: "This page can only hold an agent" }, { status: 400 })
      }
      if (submitForReview === true) {
        return NextResponse.json(
          { error: "Agent pages are reviewed when you upload a version" },
          { status: 400 }
        )
      }
    }

    // An agent stays an agent: its page is what Condor installs by slug and
    // what its uploaded versions belong to, so the type can't change.
    if (currentStrategy.strategyType === "AGENT" && strategyType !== undefined && strategyType !== "AGENT") {
      return NextResponse.json({ error: "An agent's type can't be changed" }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Content updates allowed before certification, and after it for a
    // selected hackathon entry until the finals code freeze.
    const hackathonEdit = await getHackathonEditState(strategyId)
    const canEditContent = canEditWithState(hackathonEdit, currentStrategy.status)
    if (canEditContent) {
      if (title !== undefined) {
        const trimmedTitle = title.trim()
        if (!trimmedTitle) {
          return NextResponse.json({ error: "Title is required" }, { status: 400 })
        }
        updateData.title = trimmedTitle
        // Renaming the strategy also updates its public slug/URL — except for
        // a hackathon entry, whose race pages key on it, and an agent with an
        // approved version: Condor addresses it by slug (its Hub listing_id and
        // slug lookup), so a rename mustn't strand installs.
        const slugPinnedByAgent =
          (await prisma.agentVersion.count({ where: { strategyId, status: "APPROVED" } })) > 0
        if (trimmedTitle !== currentStrategy.title && hackathonEdit.kind === "none" && !slugPinnedByAgent) {
          updateData.slug = await generateUniqueSlug(trimmedTitle, "strategy", strategyId)
        }
      }
      if (summary !== undefined) updateData.summary = summary
      if (details !== undefined) updateData.details = details
      if (strategyType !== undefined) {
        const validTypes = ["AGENT", "SCRIPT", "CONTROLLER", "V1_STRATEGY", "OTHER"]
        if (validTypes.includes(strategyType)) {
          updateData.strategyType = strategyType
        }
      }
      if (videoURL !== undefined) updateData.videoURL = videoURL || null
      const cleanedTags =
        tags !== undefined && Array.isArray(tags)
          ? tags.map((t: string) => t.trim()).filter(Boolean)
          : null
      const cleanedExchanges =
        exchanges !== undefined && Array.isArray(exchanges)
          ? exchanges.map((e: string) => e.trim()).filter(Boolean)
          : null

      // Users can only pick from existing tags/exchanges, not coin new ones.
      // Both vocabularies come from one scan; skip it if neither was supplied.
      if (cleanedTags?.length || cleanedExchanges?.length) {
        const existing = await getExistingValues()
        const tagMatch = resolveToExisting(cleanedTags ?? [], existing.tags)
        const exchangeMatch = resolveToExisting(cleanedExchanges ?? [], existing.exchanges)
        const unknown = [...tagMatch.unknown, ...exchangeMatch.unknown]
        if (unknown.length) {
          return NextResponse.json(
            { error: `Unrecognized tags or exchanges: ${unknown.join(", ")}` },
            { status: 400 }
          )
        }
        if (cleanedTags) updateData.tags = tagMatch.resolved
        if (cleanedExchanges) updateData.exchanges = exchangeMatch.resolved
      } else {
        // Explicitly cleared.
        if (cleanedTags) updateData.tags = []
        if (cleanedExchanges) updateData.exchanges = []
      }
    }

    // Visibility is the author's to change once the strategy is CERTIFIED, or
    // once an agent has an approved version (approval publishes it; the
    // author may hide it again).
    const visibilityUnlocked =
      currentStrategy.status === "CERTIFIED" ||
      (currentStrategy.strategyType === "AGENT" && currentStrategy.agentVersions.length > 0)
    if (visibility !== undefined && visibilityUnlocked) {
      // MEMBERS_ONLY is retired (the editor offers Public and Private); rows
      // that still carry it are members-only in decideStrategyCodeAccess.
      if (!["PUBLIC", "PRIVATE"].includes(visibility)) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 })
      }
      updateData.visibility = visibility
    }

    // Handle submit for review action
    if (submitForReview === true) {
      if (currentStrategy.status === "DRAFT" || currentStrategy.status === "CHANGES_REQUESTED") {
        updateData.status = "SUBMITTED"
        updateData.submittedAt = new Date()
      }
    }

    // Handle certify action (only when APPROVED). Certifying is a cohort's
    // last step, and certifies the authors: an agent's approval for Condor isn't one.
    const certifying = certify === true && currentStrategy.status === "APPROVED" && currentStrategy.strategyType !== "AGENT"
    if (certifying) {
      updateData.status = "CERTIFIED"
      updateData.certifiedAt = new Date()
    }

    const strategy = await prisma.strategy.update({
      where: { id: strategyId },
      data: updateData,
      include: {
        authors: {
          select: { userId: true },
        },
      },
    })

    // When a strategy is certified, mark all authors as certified
    if (certifying) {
      const authorIds = strategy.authors.map((a) => a.userId)
      await prisma.user.updateMany({
        where: { id: { in: authorIds } },
        data: { certified: true },
      })
    }

    // Notify authors when this action moved the strategy to a new status.
    if (updateData.status) {
      await sendStrategyStatusEmail(
        strategyId,
        updateData.status as StrategyStatus
      ).catch((err) =>
        console.error("Failed to send strategy status email:", err)
      )
    }

    return NextResponse.json(strategy)
  } catch (error) {
    console.error("Failed to update strategy:", error)
    return NextResponse.json(
      { error: "Failed to update strategy" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const strategyId = parseInt(id)

    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Verify user is an author of this strategy
    const authorCheck = await prisma.strategyAuthor.findUnique({
      where: {
        userId_strategyId: {
          userId: session.user.id,
          strategyId,
        },
      },
    })

    if (!authorCheck) {
      return NextResponse.json(
        { error: "You are not an author of this strategy" },
        { status: 403 }
      )
    }

    // Get current strategy to check status
    const currentStrategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      select: { status: true },
    })

    if (!currentStrategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    if (!canAuthorDeleteStrategy(currentStrategy.status)) {
      return NextResponse.json(
        { error: "Approved and certified strategies can't be deleted" },
        { status: 400 }
      )
    }

    // Agent pages stay DRAFT after a version is approved. Deleting one would
    // free the slug Condor installs by, letting someone else take the name.
    const approvedVersions = await prisma.agentVersion.count({ where: { strategyId, status: "APPROVED" } })
    if (approvedVersions > 0) {
      return NextResponse.json(
        { error: "This agent has an approved version, so its page can't be deleted — unpublish it instead" },
        { status: 409 }
      )
    }

    const blocked = await raceDataBlocksDelete({ application: { strategyId } }, "strategy")
    if (blocked) return NextResponse.json({ error: blocked }, { status: 409 })

    // An application would be left without its strategy (the relation nulls
    // out), and a race agent refuses the delete outright.
    const [applications, raceAgents] = await Promise.all([
      prisma.application.count({ where: { strategyId } }),
      prisma.raceAgent.count({ where: { strategyId } }),
    ])
    if (applications > 0 || raceAgents > 0) {
      return NextResponse.json(
        { error: "This strategy is part of a hackathon application. Remove it from the application first." },
        { status: 409 }
      )
    }

    // Delete related records first (files, authors)

    await prisma.$transaction([
      prisma.strategyFile.deleteMany({ where: { strategyId } }),
      prisma.strategyAuthor.deleteMany({ where: { strategyId } }),
      prisma.strategy.delete({ where: { id: strategyId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete strategy:", error)
    return NextResponse.json(
      { error: "Failed to delete strategy" },
      { status: 500 }
    )
  }
}
