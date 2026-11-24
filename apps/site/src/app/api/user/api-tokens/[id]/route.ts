import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/user/api-tokens/[id] - Revoke one of the user's tokens.
export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const { count } = await prisma.apiToken.deleteMany({ where: { id, userId: session.user.id } })
  if (count === 0) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 })
  }
  return NextResponse.json({ data: { id } })
}
