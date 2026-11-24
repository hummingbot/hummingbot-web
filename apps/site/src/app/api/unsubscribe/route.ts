import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"

// Maps an unsubscribe ?category= to the user preference column it clears.
const CATEGORY_FIELD: Record<
  string,
  "emailMarketing" | "emailCourseUpdates" | "emailStrategyUpdates" | "emailHackathonUpdates"
> = {
  marketing: "emailMarketing",
  course: "emailCourseUpdates",
  strategy: "emailStrategyUpdates",
  hackathon: "emailHackathonUpdates",
}

async function optOut(token: string | null, category: string | null): Promise<boolean> {
  if (!token) return false
  const field = CATEGORY_FIELD[category || "marketing"]
  if (!field) return false

  const user = await prisma.user.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true },
  })
  if (!user) return false

  await prisma.user.update({
    where: { id: user.id },
    data: { [field]: false },
  })
  return true
}

// Link click from an email — opt out, then show a confirmation page.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  const category = request.nextUrl.searchParams.get("category") || "marketing"
  const ok = await optOut(token, category)
  const status = ok ? "success" : "invalid"
  return NextResponse.redirect(
    new URL(`/unsubscribe?status=${status}&category=${category}`, request.url)
  )
}

// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post).
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  const category = request.nextUrl.searchParams.get("category") || "marketing"
  const ok = await optOut(token, category)
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 })
}
