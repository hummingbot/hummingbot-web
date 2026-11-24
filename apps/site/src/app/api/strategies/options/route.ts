import { NextResponse } from "next/server"
import { getExistingValues } from "@/botcamp/lib/strategy-tags"

// GET /api/strategies/options - Get existing tags and exchanges from non-private strategies
export async function GET() {
  try {
    // Exclude PRIVATE strategies so unreviewed drafts' free-typed tags don't
    // leak into the suggestion list shown to other users.
    const { tags, exchanges } = await getExistingValues({ includePrivate: false })

    const byName = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())

    return NextResponse.json({
      tags: [...tags].sort(byName),
      exchanges: [...exchanges].sort(byName),
    })
  } catch (error) {
    console.error("Failed to fetch strategy options:", error)
    return NextResponse.json(
      { error: "Failed to fetch strategy options" },
      { status: 500 }
    )
  }
}
