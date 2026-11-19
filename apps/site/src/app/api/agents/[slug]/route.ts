import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { resolveAgentForRequest } from "@/botcamp/lib/agent-registry"
import { SCOPE_AGENTS_PUBLISH, getAgentRequestUser } from "@/botcamp/lib/api-tokens"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/agents/[slug] - An agent's approved versions, newest first, for
// Condor's import (condor/botcamp_import.py) to pick from. Only APPROVED versions are clonable;
// pending, flagged and rejected ones are never listed here.
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { slug } = await params
    const result = await resolveAgentForRequest(request, slug)
    if (result.error) return result.error
    const { strategy } = result

    const versions = await prisma.agentVersion.findMany({
      where: { strategyId: strategy.id, status: "APPROVED" },
      select: { version: true, sha256: true, size: true, fileCount: true, manifest: true, sourceRef: true, createdAt: true },
      orderBy: { version: "desc" },
    })
    if (versions.length === 0) {
      return NextResponse.json({ error: "This agent has no approved version yet" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        // Stable across renames, unlike the slug: what a consent is pinned to.
        agentId: String(strategy.id),
        slug: strategy.slug,
        title: strategy.title,
        summary: strategy.summary,
        latest: versions[0].version,
        versions,
      },
    })
  } catch (error) {
    console.error("Error fetching agent:", error)
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 })
  }
}

// DELETE /api/agents/[slug] - The author withdraws a listing from Condor
// (condor/hub.py `unpublish`, contract §8.1; the listing_id is the slug). The
// page goes PRIVATE, so nobody else can read or clone it from then on; its
// versions and reviews are kept, and the author can list it again from the
// website. It can't recall a copy someone already installed.
export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getAgentRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: "Sign in required — connect Condor to Botcamp, then try again" }, { status: 401 })
    }
    if (!user.scopes.includes(SCOPE_AGENTS_PUBLISH)) {
      return NextResponse.json({ error: "This token can't unpublish agents — reconnect Condor to Botcamp" }, { status: 403 })
    }

    const { slug } = await params
    const strategy = await prisma.strategy.findUnique({
      where: { slug },
      select: { id: true, strategyType: true, visibility: true, authors: { select: { userId: true } } },
    })
    if (!strategy || strategy.strategyType !== "AGENT" || strategy.visibility === "PRIVATE") {
      return NextResponse.json({ error: "No such listing — it may already be unpublished" }, { status: 404 })
    }
    if (user.role !== "ADMIN" && !strategy.authors.some((a) => a.userId === user.id)) {
      return NextResponse.json({ error: "Only the agent's author can unpublish it" }, { status: 403 })
    }

    await prisma.strategy.update({ where: { id: strategy.id }, data: { visibility: "PRIVATE" } })
    return NextResponse.json({ unpublished: true })
  } catch (error) {
    console.error("Error unpublishing agent:", error)
    return NextResponse.json({ error: "Failed to unpublish agent" }, { status: 500 })
  }
}
