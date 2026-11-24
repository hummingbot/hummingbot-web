import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { resolveAgentForRequest } from "@/botcamp/lib/agent-registry"

interface RouteParams {
  params: Promise<{ slug: string; version: string }>
}

// GET /api/agents/[slug]/versions/[version] - The zip of one APPROVED
// version (`latest` for the newest), exactly as reviewed. X-Agent-Sha256
// lets Condor verify what it unpacks.
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { slug, version } = await params
    const result = await resolveAgentForRequest(request, slug)
    if (result.error) return result.error
    const { strategy } = result

    const number = version === "latest" ? null : Number(version)
    if (number !== null && !(Number.isInteger(number) && number > 0)) {
      return NextResponse.json({ error: "Version must be a number or `latest`" }, { status: 400 })
    }

    const agentVersion = await prisma.agentVersion.findFirst({
      where: { strategyId: strategy.id, status: "APPROVED", ...(number !== null && { version: number }) },
      select: { version: true, archive: true, sha256: true },
      orderBy: { version: "desc" },
    })
    if (!agentVersion) {
      return NextResponse.json(
        { error: number === null ? "This agent has no approved version yet" : `Version ${number} is not approved` },
        { status: 404 },
      )
    }

    return new NextResponse(new Uint8Array(agentVersion.archive), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${strategy.slug}-v${agentVersion.version}.zip"`,
        "X-Agent-Version": String(agentVersion.version),
        "X-Agent-Sha256": agentVersion.sha256,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("Error downloading agent version:", error)
    return NextResponse.json({ error: "Failed to download agent" }, { status: 500 })
  }
}
