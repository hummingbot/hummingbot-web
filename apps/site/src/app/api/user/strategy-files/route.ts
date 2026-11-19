import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { canEditStrategyContent } from "@/botcamp/lib/strategy-edit"
import { MAX_FILENAME_LENGTH, resolveUniqueFilename, sanitizeUploadFilename } from "@/botcamp/lib/filename-utils"
import { STRATEGY_FILE_TYPES_LABEL, strategyFileContentType } from "@/botcamp/lib/strategy-file-types"
import { MAX_LINKS_PER_STRATEGY, storeWithinUploadLimits } from "@/botcamp/lib/strategy-uploads"

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// An agent's code is its package, which is checked and reviewed per version
// before anyone sees or clones it. Loose files would sit on the same page
// unreviewed, and could change code under an approved agent without review,
// so agents take none (existing ones can still be deleted).
function agentFilesRefused() {
  return NextResponse.json(
    { error: "Agents don't take code files: upload a new version of the agent package instead" },
    { status: 400 },
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || ""

    // Handle JSON request for LINK type
    if (contentType.includes("application/json")) {
      const data = await request.json()
      const { strategyId, filename, url, sortOrder } = data

      if (!strategyId || !filename || !url) {
        return NextResponse.json(
          { error: "strategyId, filename, and url are required for links" },
          { status: 400 }
        )
      }

      const label = typeof filename === "string" ? sanitizeUploadFilename(filename) : null
      if (!label) {
        return NextResponse.json(
          { error: `Link name must be 1–${MAX_FILENAME_LENGTH} characters` },
          { status: 400 }
        )
      }

      const strategyIdNum = parseInt(strategyId)

      // Verify user is an author of this strategy
      const authorCheck = await prisma.strategyAuthor.findUnique({
        where: {
          userId_strategyId: {
            userId: session.user.id,
            strategyId: strategyIdNum,
          },
        },
      })

      if (!authorCheck) {
        return NextResponse.json(
          { error: "You are not an author of this strategy" },
          { status: 403 }
        )
      }

      const linkStrategy = await prisma.strategy.findUnique({
        where: { id: strategyIdNum },
        select: { status: true, strategyType: true },
      })

      if (!linkStrategy) {
        return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
      }
      if (linkStrategy.strategyType === "AGENT") return agentFilesRefused()

      if (!(await canEditStrategyContent(strategyIdNum, linkStrategy.status))) {
        return NextResponse.json(
          { error: "Cannot modify files after certification" },
          { status: 400 }
        )
      }

      // Validate URL format. Restrict to http(s): the stored URL is rendered
      // as a clickable link to reviewers and on public strategy pages, so a
      // javascript:/data: scheme here would be stored XSS waiting for any
      // render site that forgets target="_blank" + rel="noopener".
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return NextResponse.json(
            { error: "URL must use http or https" },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        )
      }

      const storedLink = await storeWithinUploadLimits({
        userId: session.user.id,
        role: session.user.role,
        bytes: 0,
        check: async (tx) =>
          (await tx.strategyFile.count({ where: { strategyId: strategyIdNum, type: "LINK" } })) >= MAX_LINKS_PER_STRATEGY
            ? `A strategy can hold up to ${MAX_LINKS_PER_STRATEGY} links`
            : null,
        store: (tx) =>
          tx.strategyFile.create({
            data: {
              strategyId: strategyIdNum,
              type: "LINK",
              filename: label,
              url: url.trim(),
              sortOrder: sortOrder ? parseInt(sortOrder) : 0,
            },
            select: {
              id: true,
              type: true,
              filename: true,
              url: true,
              sortOrder: true,
              createdAt: true,
            },
          }),
      })
      if ("error" in storedLink) {
        return NextResponse.json({ error: storedLink.error }, { status: 400 })
      }

      return NextResponse.json(storedLink.value)
    }

    // Handle FormData request for FILE type
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const strategyId = formData.get("strategyId") as string | null
    const sortOrder = formData.get("sortOrder") as string | null

    if (!file || !strategyId) {
      return NextResponse.json(
        { error: "File and strategyId are required" },
        { status: 400 }
      )
    }

    const safeName = sanitizeUploadFilename(file.name)
    if (!safeName) {
      return NextResponse.json(
        { error: `File name must be 1–${MAX_FILENAME_LENGTH} characters` },
        { status: 400 }
      )
    }
    const fileContentType = strategyFileContentType(safeName)
    if (!fileContentType) {
      return NextResponse.json(
        { error: `Strategies can hold ${STRATEGY_FILE_TYPES_LABEL} — "${safeName}" isn't one of those` },
        { status: 400 }
      )
    }

    const strategyIdNum = parseInt(strategyId)

    // Verify user is an author of this strategy
    const authorCheck = await prisma.strategyAuthor.findUnique({
      where: {
        userId_strategyId: {
          userId: session.user.id,
          strategyId: strategyIdNum,
        },
      },
    })

    if (!authorCheck) {
      return NextResponse.json(
        { error: "You are not an author of this strategy" },
        { status: 403 }
      )
    }

    const fileStrategy = await prisma.strategy.findUnique({
      where: { id: strategyIdNum },
      select: { status: true, strategyType: true },
    })

    if (!fileStrategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }
    if (fileStrategy.strategyType === "AGENT") return agentFilesRefused()

    if (!(await canEditStrategyContent(strategyIdNum, fileStrategy.status))) {
      return NextResponse.json(
        { error: "Cannot modify files after certification" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Check total files size for strategy (only for FILE type)
    const existingFiles = await prisma.strategyFile.findMany({
      where: { strategyId: strategyIdNum },
      select: { filename: true, size: true, type: true },
    })
    const totalSize = existingFiles
      .filter((f) => f.type === "FILE")
      .reduce((sum, f) => sum + (f.size || 0), 0)
    if (totalSize + file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Total files size exceeds 50MB limit" },
        { status: 400 }
      )
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const existingNames = new Set(existingFiles.map((f) => f.filename))
    const filename = resolveUniqueFilename(safeName, existingNames)

    const storedFile = await storeWithinUploadLimits({
      userId: session.user.id,
      role: session.user.role,
      bytes: buffer.length,
      check: async () => null,
      store: (tx) =>
        tx.strategyFile.create({
          data: {
            strategyId: strategyIdNum,
            type: "FILE",
            filename,
            content: buffer,
            mimeType: fileContentType,
            size: file.size,
            sortOrder: sortOrder ? parseInt(sortOrder) : 0,
          },
          select: {
            id: true,
            type: true,
            filename: true,
            mimeType: true,
            size: true,
            sortOrder: true,
            createdAt: true,
          },
        }),
    })
    if ("error" in storedFile) {
      return NextResponse.json({ error: storedFile.error }, { status: 400 })
    }

    return NextResponse.json(storedFile.value)
  } catch (error) {
    console.error("Failed to create strategy file:", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            error:
              "A file with this name already exists for this strategy. Rename the file or delete the existing one and try again.",
          },
          { status: 409 }
        )
      }
    }
    // Anything else is logged above, not returned: a Prisma message carries
    // the query, column names and values.
    return NextResponse.json(
      {
        error: "Failed to create strategy file",
      },
      { status: 500 }
    )
  }
}
