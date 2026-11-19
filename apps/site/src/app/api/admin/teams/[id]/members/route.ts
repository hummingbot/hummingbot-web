import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { CURRENT_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import {
  requireAdmin,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
  successResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"
import { sendEmail, emailTemplates, generateIdempotencyKey } from "@/botcamp/lib/resend"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.botcamp.xyz"

/** Best-effort welcome email — never blocks the API response or surfaces a failure. */
async function notifyNewTeamMember(params: {
  email: string
  firstName: string | null
  lastName: string | null
  teamName: string
  teamId: string
}) {
  try {
    // Find a live hackathon this team is fielding so the email has context.
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        teamIds: { has: params.teamId },
        status: { in: CURRENT_HACKATHON_STATUSES },
      },
      orderBy: { startDate: "desc" },
      select: { title: true, slug: true },
    })
    const hackathonTitle = hackathon?.title ?? "Agent Builders Cup"
    const teamReviewUrl = hackathon
      ? `${APP_URL}/hackathons/${hackathon.slug}/teams`
      : `${APP_URL}/admin/teams/${params.teamId}`

    const composed = `${params.firstName ?? ""} ${params.lastName ?? ""}`.trim()
    const userName = composed || params.email

    const template = emailTemplates.hackathonTeamMemberAdded({
      userName,
      teamName: params.teamName,
      hackathonTitle,
      teamReviewUrl,
    })

    await sendEmail({
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: generateIdempotencyKey("team-member-add", params.teamId, params.email),
    })
  } catch (err) {
    console.error("Failed to send team-member welcome email:", err)
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/teams/[id]/members - Get all members of a team
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) return notFoundResponse("Team not found")

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            slug: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return successResponse(members)
  } catch (error) {
    console.error("Error fetching team members:", error)
    return serverErrorResponse("Failed to fetch team members")
  }
}

/** Invite email for an address with no account yet — mirrors notifyNewTeamMember. */
async function sendInviteEmail(params: { email: string; teamName: string; teamId: string }) {
  try {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        teamIds: { has: params.teamId },
        status: { in: CURRENT_HACKATHON_STATUSES },
      },
      orderBy: { startDate: "desc" },
      select: { title: true },
    })

    const template = emailTemplates.teamInviteNewUser({
      teamName: params.teamName,
      hackathonTitle: hackathon?.title ?? "Agent Builders Cup",
      registerUrl: `${APP_URL}/signup`,
    })

    await sendEmail({
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: generateIdempotencyKey("team-invite", params.teamId, params.email),
    })
  } catch (err) {
    console.error("Failed to send team invite email:", err)
  }
}

// POST /api/admin/teams/[id]/members - Add a member to a team.
// Accepts either { userId } for an existing user, or { email }. With { email },
// an existing account is added directly; an unknown address gets a TeamInvite
// plus an email, and becomes a member automatically on registration
// (see claimTeamInvites).
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { id } = await params
    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) return notFoundResponse("Team not found")

    const body = await parseBody<{ userId?: string; email?: string }>(request)
    if (!body || (!body.userId && !body.email)) {
      return badRequestResponse("userId or email is required")
    }

    let user
    if (body.userId) {
      user = await prisma.user.findUnique({ where: { id: body.userId } })
      if (!user) {
        return notFoundResponse("User not found")
      }
    } else {
      const email = body.email!.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return badRequestResponse("Invalid email address")
      }

      user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      })

      if (!user) {
        // No account yet — record an invite and email them a register link.
        const existingInvite = await prisma.teamInvite.findUnique({
          where: { teamId_email: { teamId: id, email } },
        })
        if (existingInvite && !existingInvite.acceptedAt) {
          return conflictResponse("This email has already been invited")
        }

        const invite = existingInvite
          ? await prisma.teamInvite.update({
              where: { id: existingInvite.id },
              data: { acceptedAt: null, invitedById: session.user.id },
            })
          : await prisma.teamInvite.create({
              data: { teamId: id, email, invitedById: session.user.id },
            })

        // Awaited: a fire-and-forget send races serverless instance freeze —
        // the function can be suspended right after the response returns, and
        // the email only goes out if the instance happens to stay warm.
        // sendInviteEmail catches its own errors, so this can't fail the request.
        await sendInviteEmail({ email, teamName: team.name, teamId: team.id })

        return createdResponse({ invited: true, invite })
      }
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: user.id,
        },
      },
    })
    if (existingMember) {
      return conflictResponse("User is already a member of this team")
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            slug: true,
            avatarUrl: true,
          },
        },
      },
    })

    // Awaited for the same reason as sendInviteEmail above; internally
    // try/caught so a failed email never fails the add.
    await notifyNewTeamMember({
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      teamName: team.name,
      teamId: team.id,
    })

    return createdResponse(member)
  } catch (error) {
    console.error("Error adding team member:", error)
    return serverErrorResponse("Failed to add team member")
  }
}
