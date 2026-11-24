import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { IMAGE_TYPES_WITH_SVG, readImageUpload } from "@/botcamp/lib/uploaded-image"
import { sanitizeUploadFilename } from "@/botcamp/lib/filename-utils"
import { requireAdmin } from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Max image size: 2MB
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

// GET - List all images for a strategy
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const strategyId = parseInt(id)

    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const images = await prisma.strategyImage.findMany({
      where: { strategyId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        sortOrder: true,
        createdAt: true,
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json(images)
  } catch (error) {
    console.error("Failed to list images:", error)
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    )
  }
}

// POST - Upload a new image (admin can upload regardless of status)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const strategyId = parseInt(id)

    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Verify strategy exists
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      select: { id: true },
    })

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const upload = await readImageUpload(file, IMAGE_TYPES_WITH_SVG, MAX_IMAGE_SIZE)
    if ("error" in upload) {
      return NextResponse.json({ error: upload.error }, { status: 400 })
    }

    // Get current max sortOrder
    const maxSortOrder = await prisma.strategyImage.aggregate({
      where: { strategyId },
      _max: { sortOrder: true },
    })

    // Create the image
    const image = await prisma.strategyImage.create({
      data: {
        strategyId,
        filename: sanitizeUploadFilename(file.name)?.split("/").pop() ?? "image",
        data: upload.data,
        mimeType: upload.mimeType,
        size: upload.data.length,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
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

    return NextResponse.json(image)
  } catch (error) {
    console.error("Failed to upload image:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}
