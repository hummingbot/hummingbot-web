import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { MAX_FILENAME_LENGTH, resolveUniqueFilename, sanitizeUploadFilename } from "@/botcamp/lib/filename-utils"
import { strategyFileContentType } from "@/botcamp/lib/strategy-file-types"

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
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

      // Validate URL format. Restrict to http(s) — same invariant as the
      // user endpoint: stored link URLs are rendered as clickable hrefs, so
      // no script-capable scheme may ever reach the database.
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

      const createdLink = await prisma.strategyFile.create({
        data: {
          strategyId: parseInt(strategyId),
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
      })

      return NextResponse.json(createdLink)
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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Check total files size for strategy (only for FILE type)
    const existingFiles = await prisma.strategyFile.findMany({
      where: { strategyId: parseInt(strategyId) },
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

    const createdFile = await prisma.strategyFile.create({
      data: {
        strategyId: parseInt(strategyId),
        type: "FILE",
        filename,
        content: buffer,
        // From the name, never the browser's claim: a type like text/html is
        // what the download route would then serve the bytes as.
        mimeType: strategyFileContentType(filename) ?? "application/octet-stream",
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
    })

    return NextResponse.json(createdFile)
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
