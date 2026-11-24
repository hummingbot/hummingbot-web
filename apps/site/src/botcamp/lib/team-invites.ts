import { prisma } from "@/botcamp/lib/prisma"

/**
 * Converts any pending TeamInvites for this email into TeamMember rows.
 * Called from every user-creation path (OAuth createUser event, verify-code,
 * email callback) right after the user row exists. Being a TeamMember is what
 * grants team-admin access to /dashboard/team.
 *
 * Non-fatal by design: registration must never fail because of an invite,
 * so callers can fire-and-forget. Idempotent: claimed invites are stamped
 * with acceptedAt and skipped on any later call.
 */
export async function claimTeamInvites(userId: string, email: string) {
  try {
    const invites = await prisma.teamInvite.findMany({
      where: { email: email.toLowerCase(), acceptedAt: null },
      select: { id: true, teamId: true },
    })
    if (invites.length === 0) return

    for (const invite of invites) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: invite.teamId, userId } },
        create: { teamId: invite.teamId, userId },
        update: {},
      })
      await prisma.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      })
    }

    console.log(
      `Claimed ${invites.length} team invite(s) for ${email} -> user ${userId}`
    )
  } catch (err) {
    console.error("Failed to claim team invites:", err)
  }
}
