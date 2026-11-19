import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/botcamp/lib/auth"
import { prisma } from "@/botcamp/lib/prisma"
import { getDiscordAuthorizeUrl, DISCORD_STATE_COOKIE } from "@/botcamp/lib/discord"

/**
 * Entry point for the "unlock the private hackathon Discord channel" CTA.
 * Requires the user to be signed in and registered for the given hackathon
 * before sending them into the Discord OAuth flow.
 */
export async function GET(request: NextRequest) {
  const hackathonSlug = request.nextUrl.searchParams.get("hackathon")
  if (!hackathonSlug) {
    return NextResponse.json({ error: "Missing hackathon slug" }, { status: 400 })
  }

  const hubUrl = new URL(`/dashboard/hackathons/${hackathonSlug}`, request.url)

  const session = await auth()
  if (!session?.user?.id) {
    const signinUrl = new URL("/signin", request.url)
    signinUrl.searchParams.set("callbackUrl", hubUrl.pathname)
    return NextResponse.redirect(signinUrl)
  }

  const hackathon = await prisma.hackathon.findUnique({
    where: { slug: hackathonSlug },
    select: { id: true },
  })
  if (!hackathon) {
    return NextResponse.json({ error: "Hackathon not found" }, { status: 404 })
  }

  const entry = await prisma.hackathonEntry.findUnique({
    where: { hackathonId_userId: { hackathonId: hackathon.id, userId: session.user.id } },
    select: { id: true },
  })
  if (!entry) {
    hubUrl.searchParams.set("discord", "not_registered")
    return NextResponse.redirect(hubUrl)
  }

  const nonce = crypto.randomUUID()
  const state = `${nonce}:${hackathonSlug}`

  const response = NextResponse.redirect(getDiscordAuthorizeUrl(state))
  response.cookies.set(DISCORD_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  })
  return response
}
