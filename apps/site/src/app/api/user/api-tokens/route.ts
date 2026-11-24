import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { MAX_API_TOKENS_PER_USER, activeApiTokenWhere, apiTokenExpiresAt, generateApiToken } from "@/botcamp/lib/api-tokens"

const tokenSelect = { id: true, name: true, prefix: true, scopes: true, expiresAt: true, lastUsedAt: true, createdAt: true }

// GET /api/user/api-tokens - The signed-in user's tokens (never the token).
export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.user.id },
    select: tokenSelect,
    orderBy: { createdAt: "desc" },
  })
  // A legacy row has no expiresAt but still expires (apiTokenExpiresAt), so
  // the profile doesn't show a dead token as connected.
  return NextResponse.json({ data: tokens.map((t) => ({ ...t, expiresAt: apiTokenExpiresAt(t) })) })
}

// POST /api/user/api-tokens - Create a token for Condor. The plaintext is in
// this response only; Botcamp keeps just its hash.
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { name?: unknown }
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : ""
    if (!name) {
      return NextResponse.json({ error: "Name the token, e.g. the machine running Condor" }, { status: 400 })
    }

    const count = await prisma.apiToken.count({ where: activeApiTokenWhere(session.user.id) })
    if (count >= MAX_API_TOKENS_PER_USER) {
      return NextResponse.json(
        { error: `You can have up to ${MAX_API_TOKENS_PER_USER} tokens — revoke one first` },
        { status: 400 },
      )
    }

    const { token, tokenHash, prefix, expiresAt } = generateApiToken()
    const created = await prisma.apiToken.create({
      data: { userId: session.user.id, name, tokenHash, prefix, expiresAt },
      select: tokenSelect,
    })
    return NextResponse.json({ data: { ...created, token } }, { status: 201 })
  } catch (error) {
    console.error("Error creating API token:", error)
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 })
  }
}
