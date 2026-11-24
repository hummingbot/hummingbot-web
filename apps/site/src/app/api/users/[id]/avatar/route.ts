import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { RASTER_IMAGE_TYPES, readImageUpload, uploadedImageResponse } from "@/botcamp/lib/uploaded-image"
import { requireAdmin } from "@/botcamp/lib/api-utils"

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/users/[id]/avatar - Serve avatar image
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        avatarData: true,
        avatarMimeType: true,
        avatarUrl: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If user has uploaded avatar data, serve it
    if (user.avatarData && user.avatarMimeType) {
      return uploadedImageResponse(user.avatarData, user.avatarMimeType)
    }

    // If user has legacy URL, redirect to it
    if (user.avatarUrl) {
      return NextResponse.redirect(user.avatarUrl)
    }

    // No avatar
    return NextResponse.json({ error: "No avatar found" }, { status: 404 })
  } catch (error) {
    console.error("Failed to get avatar:", error)
    return NextResponse.json(
      { error: "Failed to get avatar" },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/avatar - Admin: upload avatar for a user
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 })
    }

    const { id } = await params

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Avatars are raster only: an SVG is a document that can carry script.
    const upload = await readImageUpload(file, RASTER_IMAGE_TYPES, MAX_SIZE)
    if ("error" in upload) {
      return NextResponse.json({ error: upload.error }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        avatarData: upload.data,
        avatarMimeType: upload.mimeType,
        avatarUrl: null,
      },
      select: { id: true },
    })

    return NextResponse.json({
      success: true,
      avatarUrl: `/api/users/${user.id}/avatar`,
    })
  } catch (error) {
    console.error("Failed to upload avatar:", error)
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/avatar - Admin: remove avatar for a user
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 })
    }

    const { id } = await params

    await prisma.user.update({
      where: { id },
      data: {
        avatarData: null,
        avatarMimeType: null,
        avatarUrl: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete avatar:", error)
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    )
  }
}
