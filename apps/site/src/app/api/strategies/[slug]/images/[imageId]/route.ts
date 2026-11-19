import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { uploadedImageResponse } from "@/botcamp/lib/uploaded-image"
import { auth } from "@/botcamp/lib/auth"
import { decideStrategyCodeAccess, sessionCodeViewer, strategyAccessDenied } from "@/botcamp/lib/strategy-access"

interface RouteParams {
  params: Promise<{ slug: string; imageId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, imageId } = await params

    // Find strategy by slug
    const strategy = await prisma.strategy.findUnique({
      where: { slug },
      select: {
        id: true,
        visibility: true,
        status: true,
        authors: {
          select: { userId: true },
        },
      },
    })

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    // Same rule as the strategy's code: authors, admins and sponsor
    // reviewers always; otherwise published, not racing, not PRIVATE,
    // signed in and free or paid for. See decideStrategyCodeAccess.
    const { access } = await decideStrategyCodeAccess(strategy, await sessionCodeViewer(await auth()))
    if (access !== "ok") return strategyAccessDenied(access, "resources")

    // Find the image
    const image = await prisma.strategyImage.findFirst({
      where: {
        id: imageId,
        strategyId: strategy.id,
      },
      select: {
        data: true,
        mimeType: true,
      },
    })

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    return uploadedImageResponse(image.data, image.mimeType, { gated: true })
  } catch (error) {
    console.error("Failed to get image:", error)
    return NextResponse.json(
      { error: "Failed to get image" },
      { status: 500 }
    )
  }
}
