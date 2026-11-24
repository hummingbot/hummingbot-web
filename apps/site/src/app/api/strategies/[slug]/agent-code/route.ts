import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { readAgentZip } from "@/botcamp/lib/agent-package"
import { resolveAgentForRequest } from "@/botcamp/lib/agent-registry"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/strategies/[slug]/agent-code - The agent's code for its page's
// Code tab: the files of its newest APPROVED version, exactly what Condor
// clones, never a version still in review. Without `path`, the file list;
// with `?path=`, that file's text. Access is Condor's own
// (resolveAgentForRequest → getStrategyCodeAccess), so the page never shows
// more than Condor could clone.
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    // The website's Code tab only: Condor clones through
    // /api/agents/[slug]/versions, which also holds the clone disclaimer, so a
    // Condor token here would be a way around it.
    if (request.headers.has("authorization")) {
      return NextResponse.json({ error: "Sign in on the website to read an agent's code" }, { status: 401 })
    }
    const { slug } = await params
    const result = await resolveAgentForRequest(request, slug)
    if (result.error) return result.error

    const approved = await prisma.agentVersion.findFirst({
      where: { strategyId: result.strategy.id, status: "APPROVED" },
      orderBy: { version: "desc" },
      select: { version: true, sha256: true, archive: true },
    })
    if (!approved) {
      return NextResponse.json({ error: "This agent has no approved version yet" }, { status: 404 })
    }

    const files = await readAgentZip(Buffer.from(approved.archive))
    const path = request.nextUrl.searchParams.get("path")
    if (path !== null) {
      const file = files.find((f) => f.path === path)
      if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 })
      return NextResponse.json({ data: { path: file.path, content: file.content.toString("utf8") } })
    }

    return NextResponse.json({
      data: {
        version: approved.version,
        sha256: approved.sha256,
        files: files.map((f) => ({ path: f.path, size: f.content.length })),
      },
    })
  } catch (error) {
    console.error("Error reading agent code:", error)
    return NextResponse.json({ error: "Failed to read the agent's code" }, { status: 500 })
  }
}
