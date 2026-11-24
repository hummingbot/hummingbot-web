import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { attachmentDisposition } from "@/botcamp/lib/filename-utils"
import { decideStrategyCodeAccess, sessionCodeViewer, strategyAccessDenied } from "@/botcamp/lib/strategy-access"

interface RouteParams {
  params: Promise<{ slug: string; fileId: string }>
}

// Helper to find strategy by slug or ID
async function findStrategy(slug: string) {
  const isNumericId = /^\d+$/.test(slug)
  const where = isNumericId ? { id: parseInt(slug) } : { slug }
  return prisma.strategy.findUnique({
    where,
    select: {
      id: true,
      status: true,
      visibility: true,
      strategyType: true,
      // An approved agent shows its reviewed package instead of these files.
      agentVersions: { where: { status: "APPROVED" }, select: { id: true }, take: 1 },
      authors: {
        select: { userId: true },
      },
    },
  })
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, fileId } = await params

    // Get the strategy to check visibility
    const strategy = await findStrategy(slug)

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    const session = await auth()
    const { access, viewer } = await decideStrategyCodeAccess(strategy, await sessionCodeViewer(session))
    if (access !== "ok") return strategyAccessDenied(access, "code")

    // An approved agent's code is its reviewed package. Its loose files
    // predate packages and were never reviewed, so only its authors, admins
    // and sponsor team reviewers still reach them.
    if (!viewer && strategy.strategyType === "AGENT" && strategy.agentVersions.length > 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Get the file
    const file = await prisma.strategyFile.findFirst({
      where: {
        id: fileId,
        strategyId: strategy.id,
      },
      select: {
        type: true,
        filename: true,
        content: true,
        mimeType: true,
        url: true,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // For LINK type, redirect to URL
    if (file.type === "LINK") {
      if (!file.url) {
        return NextResponse.json({ error: "Link URL not found" }, { status: 404 })
      }
      return NextResponse.redirect(file.url)
    }

    // For FILE type, return binary content
    if (!file.content) {
      return NextResponse.json({ error: "File content not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(file.content), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": attachmentDisposition(file.filename),
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Failed to download strategy file:", error)
    return NextResponse.json(
      { error: "Failed to download strategy file" },
      { status: 500 }
    )
  }
}
