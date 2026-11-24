import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { canEditStrategyContent } from "@/botcamp/lib/strategy-edit"

interface RouteParams {
  params: Promise<{ id: string; imageId: string }>
}

// DELETE - Remove an image
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, imageId } = await params
    const strategyId = parseInt(id)

    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Verify user is an author of this strategy
    const authorCheck = await prisma.strategyAuthor.findUnique({
      where: {
        userId_strategyId: {
          userId: session.user.id,
          strategyId,
        },
      },
    })

    if (!authorCheck) {
      return NextResponse.json(
        { error: "You are not an author of this strategy" },
        { status: 403 }
      )
    }

    // Check if strategy is certified
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      select: { status: true },
    })

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    if (!(await canEditStrategyContent(strategyId, strategy.status))) {
      return NextResponse.json(
        { error: "Cannot modify images after certification" },
        { status: 400 }
      )
    }

    // Verify image belongs to this strategy
    const image = await prisma.strategyImage.findFirst({
      where: {
        id: imageId,
        strategyId,
      },
    })

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // Delete the image
    await prisma.strategyImage.delete({
      where: { id: imageId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete image:", error)
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    )
  }
}
