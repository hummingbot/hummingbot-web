import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { RASTER_IMAGE_TYPES, readImageUpload } from "@/botcamp/lib/uploaded-image"
import { auth } from "@/botcamp/lib/auth"

// Max file size
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

// POST /api/users/me/avatar - Upload avatar
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

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

    // Update user with avatar data
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        avatarData: upload.data,
        avatarMimeType: upload.mimeType,
        avatarUrl: null, // Clear legacy URL
      },
      select: {
        id: true,
        avatarMimeType: true,
      },
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

// DELETE /api/users/me/avatar - Remove avatar
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
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
