import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { MAX_COMMENT_LENGTH } from "@/botcamp/lib/strategy-input"

interface RouteParams {
  params: Promise<{ slug: string; commentId: string }>
}

// Helper to find strategy by slug or ID
async function findStrategy(slug: string) {
  const isNumericId = /^\d+$/.test(slug)
  const where = isNumericId ? { id: parseInt(slug) } : { slug }
  return prisma.strategy.findUnique({
    where,
    select: { id: true },
  })
}

// Helper to check if user can modify a comment
async function canModifyComment(
  commentId: string,
  userId: string,
  userRole: string
): Promise<{ allowed: boolean; comment: { authorId: string } | null }> {
  const comment = await prisma.strategyComment.findUnique({
    where: { id: commentId },
    select: { authorId: true, deletedAt: true },
  })

  if (!comment || comment.deletedAt) {
    return { allowed: false, comment: null }
  }

  // Admin can modify any comment, authors can only modify their own
  const isAdmin = userRole === "ADMIN"
  const isCommentAuthor = comment.authorId === userId

  return { allowed: isAdmin || isCommentAuthor, comment }
}

// PUT /api/strategies/[slug]/comments/[commentId] - Edit comment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { slug, commentId } = await params

    // Verify strategy exists
    const strategy = await findStrategy(slug)
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    // Check permissions
    const { allowed, comment } = await canModifyComment(
      commentId,
      session.user.id,
      session.user.role || ""
    )

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      )
    }

    const data = await request.json()
    const { content } = data

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      )
    }
    if (content.trim().length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comments must be ${MAX_COMMENT_LENGTH.toLocaleString("en-US")} characters or fewer` },
        { status: 400 }
      )
    }

    const updatedComment = await prisma.strategyComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({ data: updatedComment })
  } catch (error) {
    console.error("Failed to update comment:", error)
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    )
  }
}

// DELETE /api/strategies/[slug]/comments/[commentId] - Soft delete comment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { slug, commentId } = await params

    // Verify strategy exists
    const strategy = await findStrategy(slug)
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    // Check permissions
    const { allowed, comment } = await canModifyComment(
      commentId,
      session.user.id,
      session.user.role || ""
    )

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      )
    }

    // Soft delete
    await prisma.strategyComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete comment:", error)
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    )
  }
}
