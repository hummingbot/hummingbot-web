import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { MAX_COMMENT_LENGTH } from "@/botcamp/lib/strategy-input"
import { sendEmail, emailTemplates } from "@/botcamp/lib/resend"
import { canTeamReviewStrategy, decideStrategyCodeAccess, sessionCodeViewer, strategyAccessDenied } from "@/botcamp/lib/strategy-access"
import { rateLimit, rateLimitedResponse } from "@/botcamp/lib/rate-limit"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// Helper to find strategy by slug or ID
async function findStrategy(slug: string) {
  const isNumericId = /^\d+$/.test(slug)
  const where = isNumericId ? { id: parseInt(slug) } : { slug }
  return prisma.strategy.findUnique({
    where,
    include: {
      authors: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              name: true,
            },
          },
        },
      },
    },
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function displayName(user: { firstName?: string | null; name?: string | null }): string {
  return user.firstName || user.name || "there"
}

// GET /api/strategies/[slug]/comments - List comments. The PUBLIC thread is
// readable by anyone, signed in or not, wherever the strategy's page is.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    const { slug } = await params

    // Verify strategy exists
    const strategy = await findStrategy(slug)

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    // The public Discussion is open to everyone who can see the strategy's
    // page — the code may be locked to them (sign-in, membership), the PUBLIC
    // comments aren't. Botcamp's security review (2026-11, L5) still holds:
    // a PRIVATE strategy's, a draft's or a racing entry's thread is about code
    // that isn't public, so it stays closed to anyone who can't read that code.
    const { access } = await decideStrategyCodeAccess(strategy, await sessionCodeViewer(session))
    if (access === "racing" || access === "private" || access === "not_found") {
      return strategyAccessDenied(access, "code")
    }

    // Visibility gate: ADMIN comments are for admins only; AUTHOR comments
    // are for the strategy's author(s) plus admins; PUBLIC is for everyone.
    const isAdmin = session?.user?.role === "ADMIN"
    const isAuthor = !!session?.user?.id && strategy.authors.some((a) => a.userId === session.user?.id)
    const visibilityFilter: ("PUBLIC" | "AUTHOR" | "ADMIN")[] = isAdmin
      ? ["PUBLIC", "AUTHOR", "ADMIN"]
      : isAuthor
        ? ["PUBLIC", "AUTHOR"]
        : ["PUBLIC"]

    // Get comments (excluding soft-deleted ones)
    const comments = await prisma.strategyComment.findMany({
      where: {
        strategyId: strategy.id,
        deletedAt: null,
        visibility: { in: visibilityFilter },
      },
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
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ data: comments })
  } catch (error) {
    console.error("Failed to fetch comments:", error)
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    )
  }
}

// POST /api/strategies/[slug]/comments - Create comment (authors + admins only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { slug } = await params

    // Verify strategy exists and check permissions
    const strategy = await findStrategy(slug)

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    // Authors, admins, and the sponsor reviewers judging this entry. A team
    // reviewing an application needs to ask the builder questions here; that
    // is the only write this grant carries (editing or deleting a comment
    // still requires being its own author — see comments/[commentId]).
    const isAuthor = strategy.authors.some((a) => a.userId === session.user?.id)
    const isAdmin = session.user.role === "ADMIN"
    const isTeamReviewer =
      !isAuthor && !isAdmin
        ? await canTeamReviewStrategy(strategy.id, session.user.id)
        : false

    if (!isAuthor && !isAdmin && !isTeamReviewer) {
      return NextResponse.json(
        { error: "Only authors, admins, and reviewing teams can comment" },
        { status: 403 }
      )
    }

    // Every comment emails the other side; cap how fast one account posts.
    const limit = await rateLimit(`strategy-comment:user:${session.user.id}`, 30, 60 * 60 * 1000)
    if (!limit.ok) return rateLimitedResponse(limit, "You're commenting too fast — try again later")

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

    // Only admins can restrict who sees a comment — an author or team
    // reviewer's comment is always PUBLIC, regardless of what's sent.
    const VALID_VISIBILITIES = ["PUBLIC", "AUTHOR", "ADMIN"] as const
    const requestedVisibility = data.visibility
    const visibility =
      isAdmin && VALID_VISIBILITIES.includes(requestedVisibility) ? requestedVisibility : "PUBLIC"

    const comment = await prisma.strategyComment.create({
      data: {
        strategyId: strategy.id,
        authorId: session.user.id,
        content: content.trim(),
        visibility,
      },
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

    // Notify strategy authors + commenting admin when an admin posts a comment
    if (isAdmin) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const strategyUrl = `${appUrl}/strategies/${strategy.slug}`
      const commenterName = displayName(comment.author)
      const commentText = comment.content
      const commentHtml = escapeHtml(commentText).replace(/\n/g, "<br>")

      const recipients: Array<{
        email: string
        name: string
        type: "author" | "commenter"
      }> = []

      // Strategy authors (exclude the commenting admin if they happen to be an
      // author, and skip entirely for an admin-only note the author must never see)
      for (const a of visibility === "ADMIN" ? [] : strategy.authors) {
        if (a.userId === session.user.id) continue
        if (!a.user?.email) continue
        recipients.push({
          email: a.user.email,
          name: displayName(a.user),
          type: "author",
        })
      }

      // The commenting admin (confirmation copy)
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, firstName: true, name: true },
      })
      if (adminUser?.email) {
        recipients.push({
          email: adminUser.email,
          name: displayName(adminUser),
          type: "commenter",
        })
      }

      await Promise.all(
        recipients.map(async (r) => {
          const tpl = emailTemplates.strategyComment({
            recipientName: r.name,
            recipientType: r.type,
            commenterName,
            strategyTitle: strategy.title,
            strategyUrl,
            commentText,
            commentHtml,
          })
          return sendEmail({
            to: r.email,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
          }).catch((err) => {
            console.error(`Failed to send strategy-comment email to ${r.email}:`, err)
          })
        })
      )
    }

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (error) {
    console.error("Failed to create comment:", error)
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}
