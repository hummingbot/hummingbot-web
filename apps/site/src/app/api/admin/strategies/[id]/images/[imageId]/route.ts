import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { requireAdmin } from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string; imageId: string }>
}

// DELETE - Remove an image (admin can delete regardless of status)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, imageId } = await params
    const strategyId = parseInt(id)

    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
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
