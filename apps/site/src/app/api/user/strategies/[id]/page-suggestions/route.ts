import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { SUGGESTIBLE_FIELDS, readPageSuggestions, withoutField, type SuggestibleField } from "@/botcamp/lib/agent-page-suggestions"
import { strategyInputError } from "@/botcamp/lib/strategy-input"
import { canEditWithState, getHackathonEditState } from "@/botcamp/lib/strategy-edit"
import { generateUniqueSlug } from "@/botcamp/lib/slug"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/user/strategies/[id]/page-suggestions - The author's answer to
// one field of a reviewer's suggestion: `accept` writes the suggested text to
// the page, `dismiss` drops it. Either way that field leaves the suggestion,
// which clears once every field is answered.
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const strategyId = Number((await params).id)
    if (!Number.isInteger(strategyId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const { action, field } = ((await request.json().catch(() => ({}))) ?? {}) as { action?: string; field?: string }
    if (action !== "accept" && action !== "dismiss") {
      return NextResponse.json({ error: "action must be accept or dismiss" }, { status: 400 })
    }
    if (!SUGGESTIBLE_FIELDS.includes(field as SuggestibleField)) {
      return NextResponse.json({ error: `field must be one of ${SUGGESTIBLE_FIELDS.join(", ")}` }, { status: 400 })
    }
    const key = field as SuggestibleField

    const strategy = await prisma.strategy.findFirst({
      where: { id: strategyId, authors: { some: { userId: session.user.id } } },
      select: { id: true, title: true, status: true, pageSuggestions: true },
    })
    if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 })

    const suggestions = readPageSuggestions(strategy.pageSuggestions)
    const suggested = suggestions?.fields[key]
    if (!suggestions || suggested === undefined) {
      return NextResponse.json({ error: "There's no suggestion for that field" }, { status: 404 })
    }

    const update: Prisma.StrategyUpdateInput = {}
    if (action === "accept") {
      // Taking on a suggestion is an edit, so it follows the editor's rules
      // (PATCH /api/user/strategies/[id]): its text limits, the content lock
      // after certification or a finals code freeze, and the rename rule.
      const inputError = strategyInputError({ [key]: suggested })
      if (inputError) return NextResponse.json({ error: inputError }, { status: 400 })
      const hackathonEdit = await getHackathonEditState(strategy.id)
      if (!canEditWithState(hackathonEdit, strategy.status)) {
        return NextResponse.json({ error: "This page's content is locked" }, { status: 400 })
      }
      update[key] = suggested
      if (key === "title" && suggested !== strategy.title && hackathonEdit.kind === "none") {
        // Condor addresses an agent with an approved version by slug, so a
        // rename keeps it; otherwise the URL follows the name, as in PATCH.
        const slugPinnedByAgent =
          (await prisma.agentVersion.count({ where: { strategyId: strategy.id, status: "APPROVED" } })) > 0
        if (!slugPinnedByAgent) update.slug = await generateUniqueSlug(suggested, "strategy", strategy.id)
      }
    }
    const rest = withoutField(suggestions, key)
    update.pageSuggestions = rest ? (rest as unknown as Prisma.InputJsonValue) : Prisma.DbNull

    await prisma.strategy.update({ where: { id: strategy.id }, data: update })
    return NextResponse.json({ data: { field: key, value: action === "accept" ? suggested : null, remaining: rest } })
  } catch (error) {
    console.error("Error answering a page suggestion:", error)
    return NextResponse.json({ error: "Failed to update the suggestion" }, { status: 500 })
  }
}
