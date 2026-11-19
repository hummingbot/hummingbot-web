import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { IMAGE_TYPES_WITH_SVG, readImageUpload } from "@/botcamp/lib/uploaded-image"
import { sanitizeUploadFilename } from "@/botcamp/lib/filename-utils"
import { auth } from "@/botcamp/lib/auth"
import { canEditStrategyContent } from "@/botcamp/lib/strategy-edit"
import { MAX_IMAGES_PER_STRATEGY, storeWithinUploadLimits } from "@/botcamp/lib/strategy-uploads"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Max image size: 2MB
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

// GET - List all images for a strategy
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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

// POST - Upload a new image
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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
      select: { status: true, strategyType: true },
    })

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    // An agent's page is its reviewed package and its text — no resources.
    if (strategy.strategyType === "AGENT") {
      return NextResponse.json({ error: "Agents don't take images or resources" }, { status: 400 })
    }

    if (!(await canEditStrategyContent(strategyId, strategy.status))) {
      return NextResponse.json(
        { error: "Cannot modify images after certification" },
        { status: 400 }
      )
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

    const stored = await storeWithinUploadLimits({
      userId: session.user.id,
      role: session.user.role,
      bytes: upload.data.length,
      check: async (tx) =>
        (await tx.strategyImage.count({ where: { strategyId } })) >= MAX_IMAGES_PER_STRATEGY
          ? `A strategy can hold up to ${MAX_IMAGES_PER_STRATEGY} images`
          : null,
      store: async (tx) => {
        // Get current max sortOrder
        const maxSortOrder = await tx.strategyImage.aggregate({
          where: { strategyId },
          _max: { sortOrder: true },
        })

        // Create the image
        return tx.strategyImage.create({
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
      },
    })
    if ("error" in stored) {
      return NextResponse.json({ error: stored.error }, { status: 400 })
    }

    return NextResponse.json(stored.value)
  } catch (error) {
    console.error("Failed to upload image:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}
