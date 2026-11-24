import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { sanitizeUploadFilename } from "@/botcamp/lib/filename-utils"
import { decideStrategyCodeAccess, sessionCodeViewer, strategyAccessDenied } from "@/botcamp/lib/strategy-access"
import { embedLink, newEmbedBudget, sanitizeSegment } from "@/botcamp/lib/strategy-link-embed"
import { rateLimit, rateLimitedResponse } from "@/botcamp/lib/rate-limit"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// Helper to find strategy by slug or ID
async function findStrategy(slug: string) {
  const isNumericId = /^\d+$/.test(slug)
  const where = isNumericId ? { id: parseInt(slug) } : { slug }
  return prisma.strategy.findUnique({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      visibility: true,
      strategyType: true,
      // An approved agent's code is its reviewed package, not these files.
      agentVersions: { where: { status: "APPROVED" }, select: { id: true }, take: 1 },
      authors: {
        select: { userId: true },
      },
    },
  })
}

// GET /api/strategies/[slug]/files/download-all - Zip every strategy file
// into one archive: uploaded FILEs go in directly, LINKs get a best-effort
// fetch (GitHub/gist/Drive) via embedLink, falling back to a text pointer
// when they can't be fetched. Access is decideStrategyCodeAccess, as for
// files/[fileId]/download and files/[fileId]/content.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

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
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    const files = await prisma.strategyFile.findMany({
      where: { strategyId: strategy.id },
      select: { filename: true, content: true, type: true, url: true },
      orderBy: { sortOrder: "asc" },
    })

    if (files.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 404 })
    }

    // Linked code is fetched from GitHub/Drive into the zip
    // (strategy-link-embed.ts); cap how often one account can make the server
    // do that. Zips of uploaded files only aren't limited. Access needs
    // sign-in, so there is always a user here.
    if (files.some((file) => file.type === "LINK" && file.url)) {
      const limit = await rateLimit(`download-all:user:${session?.user?.id}`, 30, 60 * 60 * 1000)
      if (!limit.ok) return rateLimitedResponse(limit)
    }

    const zip = new JSZip()
    const rootDir = sanitizeSegment(strategy.title)
    let embeddedCount = 0

    const budget = newEmbedBudget()
    for (const file of files) {
      if (file.type === "FILE" && file.content) {
        zip.file(`${rootDir}/${sanitizeUploadFilename(file.filename) ?? "file"}`, file.content)
        embeddedCount++
        continue
      }
      if (file.type === "LINK" && file.url) {
        // Best-effort: GitHub repos/files/gists and public Google Drive files
        // get fetched into <rootDir>/code/<label>/; anything else (e.g. a
        // Drive folder) falls back to a text pointer so it isn't silently dropped.
        const outcome = await embedLink(zip, rootDir, file.filename, file.url, budget)
        if (outcome?.status === "embedded") {
          embeddedCount++
        } else {
          const reason = outcome?.status === "skipped" || outcome?.status === "failed" ? outcome.reason : "Unknown error"
          zip.file(`${rootDir}/${sanitizeSegment(file.filename)}.link.txt`, `${file.url}\n\n(not embedded: ${reason})\n`)
        }
      }
    }

    if (embeddedCount === 0) {
      return NextResponse.json({ error: "No downloadable files" }, { status: 404 })
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer" })
    const zipName = `${rootDir || "strategy"}-files.zip`
    const asciiFallback = zipName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'")

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(zipName)}`,
      },
    })
  } catch (error) {
    console.error("Failed to zip strategy files:", error)
    return NextResponse.json({ error: "Failed to zip strategy files" }, { status: 500 })
  }
}
