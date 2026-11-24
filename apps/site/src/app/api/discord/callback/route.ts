import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/botcamp/lib/auth"
import { prisma } from "@/botcamp/lib/prisma"
import {
  exchangeDiscordCode,
  getDiscordUser,
  grantHackathonDiscordRole,
  DISCORD_STATE_COOKIE,
} from "@/botcamp/lib/discord"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const [nonce, hackathonSlug] = (state || "").split(":")

  const fallbackUrl = new URL(hackathonSlug ? `/dashboard/hackathons/${hackathonSlug}` : "/dashboard", request.url)

  const cookieNonce = request.cookies.get(DISCORD_STATE_COOKIE)?.value
  const response = (url: URL) => {
    const res = NextResponse.redirect(url)
    res.cookies.delete(DISCORD_STATE_COOKIE)
    return res
  }

  if (!code || !nonce || !hackathonSlug || !cookieNonce || cookieNonce !== nonce) {
    fallbackUrl.searchParams.set("discord", "error")
    return response(fallbackUrl)
  }

  const session = await auth()
  if (!session?.user?.id) {
    const signinUrl = new URL("/signin", request.url)
    signinUrl.searchParams.set("callbackUrl", fallbackUrl.pathname)
    return response(signinUrl)
  }

  try {
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug: hackathonSlug },
      select: { id: true },
    })
    const entry = hackathon
      ? await prisma.hackathonEntry.findUnique({
          where: { hackathonId_userId: { hackathonId: hackathon.id, userId: session.user.id } },
          select: { id: true },
        })
      : null

    if (!hackathon || !entry) {
      fallbackUrl.searchParams.set("discord", "not_registered")
      return response(fallbackUrl)
    }

    const tokenData = await exchangeDiscordCode(code)
    const discordUser = await getDiscordUser(tokenData.access_token)

    const result = await grantHackathonDiscordRole(discordUser.id)

    if (result === "not_member") {
      fallbackUrl.searchParams.set("discord", "not_member")
      return response(fallbackUrl)
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { discordId: discordUser.id, discord: discordUser.username },
    })

    fallbackUrl.searchParams.set("discord", "success")
    return response(fallbackUrl)
  } catch (err) {
    console.error("Discord OAuth callback failed:", err)
    fallbackUrl.searchParams.set("discord", "error")
    return response(fallbackUrl)
  }
}
