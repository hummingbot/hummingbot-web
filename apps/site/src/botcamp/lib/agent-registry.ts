import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { SCOPE_AGENTS_READ, getAgentRequestUser } from "@/botcamp/lib/api-tokens"
import { getStrategyCodeAccess } from "@/botcamp/lib/strategy-access"

// Shared by the /api/agents routes Condor clones from: resolve the agent
// strategy and check the caller may read its code, with the same rules as
// the website (getStrategyCodeAccess). Responses are JSON errors a CLI can
// show as-is.

const ACCESS_ERRORS = {
  not_found: { status: 404, error: "Agent not found" },
  racing: { status: 403, error: "This agent is racing in a hackathon — it can be cloned once the race is over" },
  private: { status: 403, error: "This agent is private" },
  sign_in: {
    status: 401,
    // Condor gets its token through "Connect Botcamp" (a code from /connect), not
    // a pasted one, so the fix is to connect — not to go make a token.
    error: "Sign in required — connect Condor to Botcamp (Agent Hub → Sign in to Botcamp), then try again",
  },
  payment: { status: 402, error: "A Botcamp membership or strategy unlock is required to clone this agent" },
} as const

export async function resolveAgentForRequest(request: NextRequest, slug: string) {
  const user = await getAgentRequestUser(request)
  if (!user && request.headers.has("authorization")) {
    return { error: NextResponse.json({ error: "Invalid, expired or revoked token — reconnect Condor to Botcamp" }, { status: 401 }) }
  }
  if (user && !user.scopes.includes(SCOPE_AGENTS_READ)) {
    return { error: NextResponse.json({ error: "This token can't read agents" }, { status: 403 }) }
  }

  const strategy = await prisma.strategy.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      status: true,
      visibility: true,
      strategyType: true,
      authors: { select: { userId: true } },
    },
  })
  if (!strategy || strategy.strategyType !== "AGENT") {
    return { error: NextResponse.json(ACCESS_ERRORS.not_found, { status: 404 }) }
  }

  const access = await getStrategyCodeAccess(strategy, user)
  if (access !== "ok") {
    const { status, error } = ACCESS_ERRORS[access]
    return { error: NextResponse.json({ error }, { status }) }
  }
  return { strategy, user }
}
