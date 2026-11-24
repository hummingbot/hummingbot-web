import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { bearerApiToken, getAgentRequestUser, hashApiToken } from "@/botcamp/lib/api-tokens"

// GET /api/condor/me - Who a token belongs to and what it may do, so Condor
// can show "Connected as …", notice a revoked token, and know when to reconnect.
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAgentRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: "Invalid, expired or revoked token — reconnect Condor to Botcamp" }, { status: 401 })
    }
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true, slug: true },
    })
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || profile?.email || ""
    return NextResponse.json({
      data: {
        user: { id: user.id, name, slug: profile?.slug ?? null },
        scopes: user.scopes,
        expires_at: user.tokenExpiresAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error("Error reading token owner:", error)
    return NextResponse.json({ error: "Failed to read token" }, { status: 500 })
  }
}

// DELETE /api/condor/me - Revoke the token making the call: "Disconnect" in
// Condor. Token only — a browser session revokes from the profile page.
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const presented = bearerApiToken(request)
    if (!presented) {
      return NextResponse.json({ error: "Send the token to revoke as `Authorization: Bearer <token>`" }, { status: 401 })
    }
    const { count } = await prisma.apiToken.deleteMany({ where: { tokenHash: hashApiToken(presented) } })
    if (count === 0) {
      return NextResponse.json({ error: "Invalid, expired or revoked token — reconnect Condor to Botcamp" }, { status: 401 })
    }
    return NextResponse.json({ data: { revoked: true } })
  } catch (error) {
    console.error("Error revoking token:", error)
    return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 })
  }
}
