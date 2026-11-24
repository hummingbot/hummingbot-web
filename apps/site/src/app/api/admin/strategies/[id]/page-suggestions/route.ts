import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { requireAdmin, unauthorizedResponse, badRequestResponse, notFoundResponse, serverErrorResponse } from "@/botcamp/lib/api-utils"
import { buildPageSuggestions } from "@/botcamp/lib/agent-page-suggestions"
import { sendAgentPageSuggestionsEmail } from "@/botcamp/lib/notifications"

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/admin/strategies/[id]/page-suggestions - An admin's suggested
// wording for an agent page's title, summary or details, made while
// reviewing it. Replaces any earlier suggestion; sending the page's own text
// (no changes) withdraws it. The authors are emailed and accept or dismiss
// each field from the editor — nothing on the page changes until they do.
export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const strategyId = Number((await params).id)
    if (!Number.isInteger(strategyId)) return badRequestResponse("Invalid ID")

    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      select: { id: true, strategyType: true, title: true, summary: true, details: true },
    })
    if (!strategy) return notFoundResponse("Strategy not found")
    if (strategy.strategyType !== "AGENT") return badRequestResponse("Page suggestions are for agent pages")

    const built = buildPageSuggestions(await request.json().catch(() => null), strategy, session.user.id)
    if (built.error) return badRequestResponse(built.error)

    await prisma.strategy.update({
      where: { id: strategyId },
      data: {
        pageSuggestions: built.suggestions
          ? (built.suggestions as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    })
    if (built.suggestions) {
      await sendAgentPageSuggestionsEmail(strategyId).catch((err) =>
        console.error(`Failed to send page suggestions email for strategy ${strategyId}:`, err),
      )
    }
    return NextResponse.json({ data: built.suggestions })
  } catch (error) {
    console.error("Error saving page suggestions:", error)
    return serverErrorResponse("Failed to save the suggestions")
  }
}
