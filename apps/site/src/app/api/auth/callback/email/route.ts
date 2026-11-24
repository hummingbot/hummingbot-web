import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { sendWelcomeEmail } from "@/botcamp/lib/notifications"
import { claimTeamInvites } from "@/botcamp/lib/team-invites"
import { issueLoginTicket } from "@/botcamp/lib/login-ticket"
import { hasControlCharacters } from "@/botcamp/lib/validation"
import { safeCallbackUrl } from "@/botcamp/lib/app-url"
import { hashMagicLinkToken } from "@/botcamp/lib/sign-in-code"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")
    const email = searchParams.get("email")
    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))

    if (!token || !email) {
      return NextResponse.redirect(
        new URL("/signin?error=Invalid verification link", request.url)
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (hasControlCharacters(normalizedEmail) || hasControlCharacters(token)) {
      return NextResponse.redirect(
        new URL("/signin?error=Invalid verification link", request.url)
      )
    }

    // Only the token's hash is stored. Deleting it is the check: the link is
    // good once, and only if it hadn't expired. It's deleted in the same
    // transaction that creates or verifies the user, so a failure there
    // leaves the link working for a retry.
    const tokenHash = hashMagicLinkToken(token)
    const outcome = await prisma.$transaction(async (tx) => {
      const { count: consumed } = await tx.verificationToken.deleteMany({
        where: { identifier: normalizedEmail, token: tokenHash, expires: { gt: new Date() } },
      })
      if (consumed === 0) return null

      const existing = await tx.user.findUnique({ where: { email: normalizedEmail } })
      if (existing) {
        if (!existing.emailVerified) {
          await tx.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } })
        }
        return { user: existing, created: false }
      }

      // Look for pending signup info (firstName, lastName, username from signup form)
      const pendingSignup = await tx.verificationCode.findFirst({
        where: {
          email: normalizedEmail,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: "desc" },
      })

      const firstName = pendingSignup?.firstName || null
      const lastName = pendingSignup?.lastName || null

      // The username from the signup form, unless someone took it since;
      // else one generated from name/email
      let slug = pendingSignup?.username || null
      if (slug && (await tx.user.findUnique({ where: { slug }, select: { id: true } }))) slug = null
      if (!slug) {
        const nameForSlug = firstName && lastName
          ? `${firstName}-${lastName}`.toLowerCase()
          : normalizedEmail.split("@")[0].toLowerCase()
        const baseSlug = nameForSlug.replace(/[^a-z0-9-]/g, "-")
        slug = baseSlug
        let counter = 1
        while (await tx.user.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }
      }

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          firstName,
          lastName,
          name: firstName && lastName ? `${firstName} ${lastName}` : null,
          slug,
          emailVerified: new Date(),
          newsletterSubscribed: pendingSignup?.newsletterOptIn ?? false,
          termsAcceptedAt: pendingSignup?.termsAccepted ? new Date() : null,
        },
      })

      // Clean up the verification code after successful signup
      if (pendingSignup) {
        await tx.verificationCode.deleteMany({ where: { id: pendingSignup.id } })
      }
      return { user, created: true }
    })

    if (!outcome) {
      // Clean up the token if it was there but expired
      await prisma.verificationToken.deleteMany({
        where: { identifier: normalizedEmail, token: tokenHash },
      })
      return NextResponse.redirect(
        new URL("/signin?error=Invalid or expired verification link", request.url)
      )
    }

    const { user, created } = outcome
    if (created) {
      // Convert any pending team invites into memberships (non-fatal).
      await claimTeamInvites(user.id, user.email)

      // Welcome the brand-new user. Non-fatal: never block registration on it.
      try {
        await sendWelcomeEmail(user.id)
      } catch (err) {
        console.error("Failed to send welcome email:", err)
      }
    }

    // Mint a single-use login ticket and pass it to the client-side page that
    // completes sign-in. The magic-link token has already been consumed above;
    // the ticket is what the credentials provider will validate.
    const loginTicket = await issueLoginTicket(normalizedEmail)

    return NextResponse.redirect(
      new URL(
        `/auth/signin-with-email?email=${encodeURIComponent(normalizedEmail)}&ticket=${encodeURIComponent(loginTicket)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
        request.url
      )
    )
  } catch (error) {
    console.error("Magic link verification error:", error)
    return NextResponse.redirect(
      new URL("/signin?error=Verification failed", request.url)
    )
  }
}
