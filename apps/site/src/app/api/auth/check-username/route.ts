import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get("username")

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    const normalizedUsername = username.trim().toLowerCase()

    // Validate username format
    const usernameRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
    if (!usernameRegex.test(normalizedUsername)) {
      return NextResponse.json({
        available: false,
        error: "Username must be 3-30 characters, alphanumeric and hyphens only",
      })
    }

    // Check if username is taken
    const existingUser = await prisma.user.findUnique({
      where: { slug: normalizedUsername },
      select: { id: true },
    })

    return NextResponse.json({
      available: !existingUser,
    })
  } catch (error) {
    console.error("Username check error:", error)
    return NextResponse.json(
      { error: "Failed to check username" },
      { status: 500 }
    )
  }
}
