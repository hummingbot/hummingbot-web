import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { canEditStrategyContent } from "@/botcamp/lib/strategy-edit"
import { MAX_FILENAME_LENGTH, sanitizeUploadFilename } from "@/botcamp/lib/filename-utils"
import { STRATEGY_FILE_TYPES_LABEL, strategyFileContentType } from "@/botcamp/lib/strategy-file-types"

interface RouteParams {
  params: Promise<{ id: string }>
}

async function verifyFileOwnership(fileId: string, userId: string) {
  const file = await prisma.strategyFile.findUnique({
    where: { id: fileId },
    select: { strategyId: true },
  })

  if (!file) return { hasAccess: false, strategyId: null }

  const authorCheck = await prisma.strategyAuthor.findUnique({
    where: {
      userId_strategyId: {
        userId,
        strategyId: file.strategyId,
      },
    },
  })

  return { hasAccess: !!authorCheck, strategyId: file.strategyId }
}

async function isStrategyLocked(strategyId: number) {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    select: { status: true },
  })
  return !!strategy && !(await canEditStrategyContent(strategyId, strategy.status))
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const { hasAccess, strategyId } = await verifyFileOwnership(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to edit this file" },
        { status: 403 }
      )
    }

    if (await isStrategyLocked(strategyId!)) {
      return NextResponse.json(
        { error: "Cannot modify files after certification" },
        { status: 400 }
      )
    }

    const data = await request.json()
    const { filename, sortOrder } = data

    // A rename gets the same checks as an upload: no path tricks or control
    // characters, and an uploaded file keeps a type strategies may hold.
    let safeName: string | null = null
    if (filename !== undefined && filename !== null && filename !== "") {
      safeName = typeof filename === "string" ? sanitizeUploadFilename(filename) : null
      if (!safeName) {
        return NextResponse.json({ error: `File name must be 1–${MAX_FILENAME_LENGTH} characters` }, { status: 400 })
      }
      const current = await prisma.strategyFile.findUnique({ where: { id }, select: { type: true } })
      if (current?.type === "FILE" && !strategyFileContentType(safeName)) {
        return NextResponse.json(
          { error: `Strategies can hold ${STRATEGY_FILE_TYPES_LABEL} — "${safeName}" isn't one of those` },
          { status: 400 },
        )
      }
    }

    const file = await prisma.strategyFile.update({
      where: { id },
      data: {
        ...(safeName && { filename: safeName }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        sortOrder: true,
        createdAt: true,
      },
    })

    return NextResponse.json(file)
  } catch (error) {
    console.error("Failed to update strategy file:", error)
    return NextResponse.json(
      { error: "Failed to update strategy file" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const { hasAccess, strategyId } = await verifyFileOwnership(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to delete this file" },
        { status: 403 }
      )
    }

    if (await isStrategyLocked(strategyId!)) {
      return NextResponse.json(
        { error: "Cannot modify files after certification" },
        { status: 400 }
      )
    }

    await prisma.strategyFile.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete strategy file:", error)
    return NextResponse.json(
      { error: "Failed to delete strategy file" },
      { status: 500 }
    )
  }
}
