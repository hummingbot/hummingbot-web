import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()
    const { filename, sortOrder } = data

    const file = await prisma.strategyFile.update({
      where: { id },
      data: {
        ...(filename && { filename }),
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
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

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
