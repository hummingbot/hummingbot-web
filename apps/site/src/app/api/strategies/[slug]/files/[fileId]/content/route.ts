import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { decideStrategyCodeAccess, sessionCodeViewer, strategyAccessDenied } from "@/botcamp/lib/strategy-access"

interface RouteParams {
  params: Promise<{ slug: string; fileId: string }>
}

// MIME types and extensions that can be displayed as code
const CODE_MIME_TYPES = [
  "text/x-python",
  "text/python",
  "application/x-python-code",
  "text/javascript",
  "application/javascript",
  "application/json",
  "text/yaml",
  "application/x-yaml",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/csv",
  "text/xml",
  "application/xml",
  "text/html",
  "text/css",
  "text/x-typescript",
  "application/typescript",
]

const CODE_EXTENSIONS = [
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".json",
  ".yaml",
  ".yml",
  ".txt",
  ".md",
  ".csv",
  ".xml",
  ".html",
  ".css",
  ".sh",
  ".bash",
  ".toml",
  ".ini",
  ".conf",
  ".config",
]

function isCodeFile(mimeType: string | null, filename: string): boolean {
  // Check MIME type
  if (mimeType && CODE_MIME_TYPES.some((t) => mimeType.includes(t))) {
    return true
  }

  // Check file extension
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  return CODE_EXTENSIONS.includes(ext)
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

export async function GET(_request: NextRequest, { params }: RouteParams) {
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
        filename: true,
        content: true,
        mimeType: true,
        type: true,
        url: true,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // For LINK type files, return the URL
    if (file.type === "LINK") {
      return NextResponse.json({
        type: "link",
        filename: file.filename,
        url: file.url,
      })
    }

    // Check if this is a code file that can be displayed
    if (!isCodeFile(file.mimeType, file.filename)) {
      return NextResponse.json(
        { error: "This file type cannot be displayed as code" },
        { status: 400 }
      )
    }

    if (!file.content) {
      return NextResponse.json({ error: "File has no content" }, { status: 400 })
    }

    // Return file content as text
    const content = Buffer.from(file.content).toString("utf-8")

    return NextResponse.json({
      type: "file",
      filename: file.filename,
      mimeType: file.mimeType,
      content,
    })
  } catch (error) {
    console.error("Failed to get file content:", error)
    return NextResponse.json(
      { error: "Failed to get file content" },
      { status: 500 }
    )
  }
}
