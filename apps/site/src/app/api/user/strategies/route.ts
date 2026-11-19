import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { getEffectiveMembership } from "@/botcamp/lib/utils"
import { hasHackathonEntry } from "@/botcamp/lib/hackathon-data"
import { createStrategy } from "@/botcamp/lib/strategy-create"
import { requestIp } from "@/botcamp/lib/request-ip"
import { getExistingValues, resolveToExisting } from "@/botcamp/lib/strategy-tags"
import { sendStrategyCreatedEmail } from "@/botcamp/lib/notifications"
import { strategyInputError } from "@/botcamp/lib/strategy-input"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a member (enrolled in cohort, or ADMIN/INSTRUCTOR)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isMember: true },
    })

    const { isMember } = getEffectiveMembership(user ?? {})

    const data = await request.json()
    const { title, summary, details, tags, exchanges, strategyType, videoURL } = data

    // Hackathon applicants aren't cohort members, but they still need to be
    // able to create an Agent/Controller strategy to apply to a team. Anyone
    // else signed in may create an Agent for the Condor agent registry; it
    // stays off /strategies until a version passes review.
    const isEligible = isMember || (await hasHackathonEntry(session.user.id))
    const agentApprovalRequired = !isEligible && strategyType === "AGENT"
    if (!isEligible && !agentApprovalRequired) {
      return NextResponse.json(
        {
          error:
            "Only cohort members and hackathon builders can create this type of strategy — set the type to Agent to share a Condor agent",
        },
        { status: 403 }
      )
    }

    const strategyTitle = typeof title === "string" ? title.trim() : ""
    if (!strategyTitle) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const inputError = strategyInputError({ title, summary, details, videoURL })
    if (inputError) {
      return NextResponse.json({ error: inputError }, { status: 400 })
    }

    // Validate strategyType if provided
    const validTypes = ["AGENT", "SCRIPT", "CONTROLLER", "V1_STRATEGY", "OTHER"]
    const validatedType = validTypes.includes(strategyType) ? strategyType : "OTHER"

    // Parse tags and exchanges if provided as comma-separated strings
    const rawTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim()).filter(Boolean))
      : []
    const rawExchanges = exchanges
      ? (Array.isArray(exchanges) ? exchanges : exchanges.split(",").map((e: string) => e.trim()).filter(Boolean))
      : []
    // Users can only pick from existing tags/exchanges, not coin new ones.
    // Skip the lookup entirely when neither was supplied.
    let parsedTags: string[] = []
    let parsedExchanges: string[] = []
    if (rawTags.length || rawExchanges.length) {
      const existing = await getExistingValues()
      const tagMatch = resolveToExisting(rawTags, existing.tags)
      const exchangeMatch = resolveToExisting(rawExchanges, existing.exchanges)
      const unknown = [...tagMatch.unknown, ...exchangeMatch.unknown]
      if (unknown.length) {
        return NextResponse.json(
          { error: `Unrecognized tags or exchanges: ${unknown.join(", ")}` },
          { status: 400 }
        )
      }
      parsedTags = tagMatch.resolved
      parsedExchanges = exchangeMatch.resolved
    }

    // The strategy and draft caps and the daily create quota are all checked
    // in createStrategy, under a lock, alongside the insert.
    const created = await createStrategy({
      userId: session.user.id,
      role: user?.role ?? "STUDENT",
      ip: requestIp(request.headers),
      title: strategyTitle,
      data: {
        summary: summary?.trim() || null,
        details: details?.trim() || null,
        videoURL: videoURL || null,
        strategyType: validatedType,
        agentApprovalRequired,
        // No cohortId for draft strategies
        tags: parsedTags,
        exchanges: parsedExchanges,
        status: "DRAFT",
        visibility: "PRIVATE",
      },
    })
    if ("refusal" in created) {
      const { error, status, retryAfterSeconds } = created.refusal
      return NextResponse.json(
        { error },
        { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined }
      )
    }
    const { strategy } = created

    await sendStrategyCreatedEmail(strategy.id).catch((err) =>
      console.error("Failed to send strategy created email:", err)
    )

    return NextResponse.json(strategy, { status: 201 })
  } catch (error) {
    console.error("Failed to create strategy:", error)
    return NextResponse.json(
      { error: "Failed to create strategy" },
      { status: 500 }
    )
  }
}
