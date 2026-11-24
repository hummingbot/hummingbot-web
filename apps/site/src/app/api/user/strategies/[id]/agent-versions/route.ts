import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import {
  checkAgentPackage,
  forAuthor,
  packageReadLimitError,
  readAgentUpload,
  saveAgentVersion,
  uploadLimitError,
  versionSelect,
} from "@/botcamp/lib/agent-upload"

interface RouteParams {
  params: Promise<{ id: string }>
}

async function authorize(params: RouteParams["params"]) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const strategyId = parseInt((await params).id)
  if (isNaN(strategyId)) {
    return { error: NextResponse.json({ error: "Invalid ID" }, { status: 400 }) }
  }
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, strategyType: true, authors: { select: { userId: true } } },
  })
  if (!strategy) {
    return { error: NextResponse.json({ error: "Strategy not found" }, { status: 404 }) }
  }
  const isAdmin = session.user.role === "ADMIN"
  if (!isAdmin && !strategy.authors.some((a) => a.userId === session.user.id)) {
    return { error: NextResponse.json({ error: "You are not an author of this strategy" }, { status: 403 }) }
  }
  return { userId: session.user.id, isAdmin, strategy }
}

// GET /api/user/strategies/[id]/agent-versions - The strategy's uploaded
// agent versions, newest first, without the archives.
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const result = await authorize(params)
    if (result.error) return result.error

    const versions = await prisma.agentVersion.findMany({
      where: { strategyId: result.strategy.id },
      select: versionSelect,
      orderBy: { version: "desc" },
    })
    return NextResponse.json({ data: versions.map(forAuthor) })
  } catch (error) {
    console.error("Error listing agent versions:", error)
    return NextResponse.json({ error: "Failed to list agent versions" }, { status: 500 })
  }
}

// POST /api/user/strategies/[id]/agent-versions - Upload a new version of
// the strategy's Condor agent: the agent folder, zipped in the browser
// (multipart `file`). The package is structure-checked; an invalid one is
// rejected with the full report (422) and not stored. A valid one is stored
// as an immutable PENDING snapshot, where it waits for the external AI
// review (docs/agent-review-api.md).
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const result = await authorize(params)
    if (result.error) return result.error
    const { userId, isAdmin, strategy } = result

    if (strategy.strategyType !== "AGENT") {
      return NextResponse.json(
        { error: "Set the strategy type to Agent before uploading an agent package" },
        { status: 400 },
      )
    }

    if (!isAdmin) {
      const limited = (await uploadLimitError(userId, strategy.id)) ?? (await packageReadLimitError(userId))
      if (limited) return limited
    }

    const read = await readAgentUpload(request)
    if (read.error) return read.error
    const { files, ...upload } = read.upload

    const checked = checkAgentPackage(files)
    if (checked.error) return checked.error

    const saved = await saveAgentVersion(strategy.id, userId, checked.report, upload, { enforceLimits: !isAdmin })
    if (saved.error) return saved.error
    return NextResponse.json({ data: forAuthor(saved.version) }, { status: 201 })
  } catch (error) {
    console.error("Error uploading agent version:", error)
    return NextResponse.json({ error: "Failed to upload agent version" }, { status: 500 })
  }
}
