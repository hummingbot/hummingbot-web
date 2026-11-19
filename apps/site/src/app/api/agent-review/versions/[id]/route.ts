import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { reviewerAuth } from "@/botcamp/lib/agent-review"
import { readAgentZip } from "@/botcamp/lib/agent-package"
import { scanAgentPackage } from "@/botcamp/lib/agent-scan"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/agent-review/versions/[id] - One agent version for the external
// reviewer: its files as text plus Botcamp's static pre-scan, or the stored
// zip with ?format=zip. Served from the snapshot, so it's exactly what an
// admin will check and Condor will clone.
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = reviewerAuth(request)
  if (auth === "disabled") return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (auth === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const version = await prisma.agentVersion.findUnique({
      where: { id },
      select: {
        id: true,
        version: true,
        status: true,
        source: true,
        sourceUrl: true,
        sourceRef: true,
        archive: true,
        sha256: true,
        manifest: true,
        warnings: true,
        createdAt: true,
        strategy: { select: { slug: true, title: true, summary: true } },
      },
    })
    if (!version) return NextResponse.json({ error: "Agent version not found" }, { status: 404 })

    if (request.nextUrl.searchParams.get("format") === "zip") {
      return new NextResponse(new Uint8Array(version.archive), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${version.strategy.slug}-v${version.version}.zip"`,
          "X-Agent-Sha256": version.sha256,
          "Cache-Control": "private, no-store",
        },
      })
    }

    const files = await readAgentZip(Buffer.from(version.archive))
    const scan = scanAgentPackage(files)
    return NextResponse.json({
      data: {
        id: version.id,
        version: version.version,
        status: version.status,
        strategy: version.strategy,
        source: version.source,
        sourceUrl: version.sourceUrl,
        sourceRef: version.sourceRef,
        sha256: version.sha256,
        manifest: version.manifest,
        warnings: version.warnings,
        uploadedAt: version.createdAt,
        files: files.map((f) => ({ path: f.path, content: f.content.toString("utf8") })),
        scan,
      },
    })
  } catch (error) {
    console.error("Error reading agent version for review:", error)
    return NextResponse.json({ error: "Failed to read the agent version" }, { status: 500 })
  }
}
