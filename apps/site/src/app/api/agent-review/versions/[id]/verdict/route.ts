import { NextRequest, NextResponse } from "next/server"
import { recordAiVerdict, reviewerAuth, VerdictSchema } from "@/botcamp/lib/agent-review"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/agent-review/versions/[id]/verdict - The external AI reviewer's
// decision on a PENDING version: approve → NEEDS_REVIEW (an admin's final
// check), reject → REJECTED with feedback for the author.
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = reviewerAuth(request)
  if (auth === "disabled") return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (auth === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    const parsed = VerdictSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid verdict", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
        { status: 400 },
      )
    }

    const result = await recordAiVerdict(id, parsed.data)
    if ("error" in result) {
      return result.error === "not_found"
        ? NextResponse.json({ error: "Agent version not found" }, { status: 404 })
        : NextResponse.json({ error: "This version isn't waiting for a review anymore" }, { status: 409 })
    }
    return NextResponse.json({ data: { id, status: result.status } })
  } catch (error) {
    console.error("Error recording agent verdict:", error)
    return NextResponse.json({ error: "Failed to record the verdict" }, { status: 500 })
  }
}
