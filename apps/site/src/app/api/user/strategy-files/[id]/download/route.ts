import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { attachmentDisposition } from "@/botcamp/lib/filename-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get the file and verify ownership
    const file = await prisma.strategyFile.findUnique({
      where: { id },
      select: {
        type: true,
        filename: true,
        content: true,
        mimeType: true,
        url: true,
        strategyId: true,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Verify user is an author of this strategy
    const authorCheck = await prisma.strategyAuthor.findUnique({
      where: {
        userId_strategyId: {
          userId: session.user.id,
          strategyId: file.strategyId,
        },
      },
    })

    if (!authorCheck) {
      return NextResponse.json(
        { error: "You do not have permission to download this file" },
        { status: 403 }
      )
    }

    // For LINK type, redirect to URL
    if (file.type === "LINK") {
      if (!file.url) {
        return NextResponse.json({ error: "Link URL not found" }, { status: 404 })
      }
      return NextResponse.redirect(file.url)
    }

    // For FILE type, return binary content
    if (!file.content) {
      return NextResponse.json({ error: "File content not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(file.content), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": attachmentDisposition(file.filename),
      },
    })
  } catch (error) {
    console.error("Failed to download strategy file:", error)
    return NextResponse.json(
      { error: "Failed to download strategy file" },
      { status: 500 }
    )
  }
}
