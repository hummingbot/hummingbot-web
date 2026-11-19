import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { sanitizeUploadFilename } from "@/botcamp/lib/filename-utils"
import { sanitizeSegment, embedLink, newEmbedBudget, type LinkOutcome } from "@/botcamp/lib/strategy-link-embed"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/strategies/[id]/download - Download strategy as a zip archive
// Includes code files, images, and a README with all metadata. For LINK-type
// files (GitHub repos/files and public Google Drive files) we attempt to fetch
// the content and embed it under `code/<label>/`; outcomes are recorded in the
// README. Video URLs are referenced in the README but never embedded.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const strategyId = parseInt(id)
    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      select: {
        slug: true,
        title: true,
        summary: true,
        details: true,
        tags: true,
        exchanges: true,
        videoURL: true,
        status: true,
        strategyType: true,
        cohortRelation: { select: { number: true } },
        authors: {
          select: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        files: {
          orderBy: { sortOrder: "asc" },
          select: {
            type: true,
            filename: true,
            content: true,
            mimeType: true,
            url: true,
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          select: { filename: true, data: true, mimeType: true },
        },
      },
    })

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    const zip = new JSZip()

    const authorNames = strategy.authors.map((a) =>
      [a.user.firstName, a.user.lastName].filter(Boolean).join(" ") || a.user.email
    )

    // Everything is wrapped in "<Title> - <Author Names>" so an extracted
    // archive lands in a self-contained, attributable directory.
    const rootDir = sanitizeSegment(
      authorNames.length > 0
        ? `${strategy.title} - ${authorNames.join(", ")}`
        : strategy.title
    )

    const fileEntries = strategy.files.filter((f) => f.type === "FILE")
    const linkEntries = strategy.files.filter((f) => f.type === "LINK")

    // Local FILE-type uploads go directly into code/.
    for (const file of fileEntries) {
      if (file.content) {
        zip.file(`${rootDir}/code/${sanitizeUploadFilename(file.filename) ?? "file"}`, file.content)
      }
    }

    // Images (flowcharts and diagrams).
    for (const image of strategy.images) {
      zip.file(`${rootDir}/images/${sanitizeUploadFilename(image.filename) ?? "image"}`, image.data)
    }

    // External links: try to fetch each and embed under code/<label>/.
    // Sequential to keep memory steady on large repos.
    const linkOutcomes: Array<{ label: string; url: string; outcome: LinkOutcome }> = []
    const budget = newEmbedBudget()
    for (const link of linkEntries) {
      if (!link.url) {
        linkOutcomes.push({
          label: link.filename,
          url: "",
          outcome: { status: "failed", reason: "Missing URL" },
        })
        continue
      }
      const outcome = await embedLink(zip, rootDir, link.filename, link.url, budget)
      linkOutcomes.push({ label: link.filename, url: link.url, outcome })
    }

    // README.md
    const readme: string[] = [
      `# ${strategy.title}`,
      "",
      "## Metadata",
      "",
      `- **Slug:** ${strategy.slug}`,
      `- **Status:** ${strategy.status}`,
      `- **Type:** ${strategy.strategyType}`,
      `- **Cohort:** ${strategy.cohortRelation ? strategy.cohortRelation.number : "None"}`,
      `- **Authors:** ${authorNames.length ? authorNames.join(", ") : "None"}`,
      `- **Tags:** ${strategy.tags.length ? strategy.tags.join(", ") : "None"}`,
      `- **Exchanges:** ${strategy.exchanges.length ? strategy.exchanges.join(", ") : "None"}`,
      `- **Video:** ${strategy.videoURL || "None"}`,
    ]

    if (strategy.summary) {
      readme.push("", "## Summary", "", strategy.summary)
    }

    if (linkOutcomes.length > 0) {
      readme.push("", "## External Links", "")
      for (const lo of linkOutcomes) {
        const desc =
          lo.outcome.status === "embedded"
            ? `embedded — ${lo.outcome.note}`
            : lo.outcome.status === "skipped"
              ? `skipped — ${lo.outcome.reason}`
              : `failed — ${lo.outcome.reason}`
        readme.push(`- [${lo.label}](${lo.url}) — ${desc}`)
      }
    }

    if (strategy.details) {
      readme.push("", "## Details", "", strategy.details)
    }

    zip.file(`${rootDir}/README.md`, readme.join("\n") + "\n")

    const buffer = await zip.generateAsync({ type: "nodebuffer" })

    // Use the sanitized title for the download name, with an ASCII fallback
    // and a UTF-8 form for clients that handle RFC 5987.
    const zipName = `${rootDir}.zip`
    const asciiFallback = zipName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'")

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(zipName)}`,
      },
    })
  } catch (error) {
    console.error("Failed to download strategy archive:", error)
    return NextResponse.json(
      { error: "Failed to download strategy archive" },
      { status: 500 }
    )
  }
}
