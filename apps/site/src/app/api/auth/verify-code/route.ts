import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { DISPOSABLE_EMAIL_ERROR, isDisposableEmail } from "@/botcamp/lib/disposable-email"
import { EMAIL_ALIAS_ERROR, mailboxHasAccount } from "@/botcamp/lib/email-alias"
import { sendWelcomeEmail } from "@/botcamp/lib/notifications"
import { claimTeamInvites } from "@/botcamp/lib/team-invites"
import { issueLoginTicket } from "@/botcamp/lib/login-ticket"
import { hasControlCharacters } from "@/botcamp/lib/validation"
import { claimVerifyAttempt, codesMatch } from "@/botcamp/lib/sign-in-code"
import { MAX_CODE_EMAILS_PER_IP_PER_HOUR } from "@/botcamp/lib/sign-in-code-limit"
import { rateLimitByIp, rateLimitedResponse } from "@/botcamp/lib/rate-limit"

// Guesses per IP per hour, across every address. The per-code cap stops
// brute-forcing one code; this stops one source from spending other people's
// attempts — six wrong guesses used to delete a stranger's code, again and
// again. Tied to the code-email cap, so raising that for a live event raises
// this too: a few guesses for every code that network may request.
const MAX_GUESSES_PER_IP_PER_HOUR = MAX_CODE_EMAILS_PER_IP_PER_HOUR * 3

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      )
    }

    const guessLimit = await rateLimitByIp("verify-code", request.headers, MAX_GUESSES_PER_IP_PER_HOUR, 60 * 60 * 1000)
    if (!guessLimit.ok) {
      return rateLimitedResponse(guessLimit, "Too many attempts from your network — try again later")
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedCode = code.toString().trim()

    if (hasControlCharacters(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      )
    }

    // Look up the active code for this email (not by guessed value) so failed
    // guesses can be counted against it instead of silently missing every time.
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      )
    }

    // Every guess, right or wrong, is counted before the comparison. A spent
    // code is refused until it expires or a new one replaces it.
    if (!(await claimVerifyAttempt(verificationCode.id))) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 429 }
      )
    }

    if (!codesMatch(verificationCode.code, normalizedCode)) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      )
    }

    // Single use: of two requests with the right code, only the one that
    // deletes it goes on.
    const { count: consumed } = await prisma.verificationCode.deleteMany({
      where: { id: verificationCode.id },
    })
    if (consumed === 0) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      )
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // If user doesn't exist, create one — never for a throwaway inbox, should
    // a code for one predate the check in request-code.
    if (!user) {
      if (await isDisposableEmail(normalizedEmail)) {
        return NextResponse.json({ error: DISPOSABLE_EMAIL_ERROR }, { status: 400 })
      }
      if (await mailboxHasAccount(normalizedEmail)) {
        return NextResponse.json({ error: EMAIL_ALIAS_ERROR }, { status: 400 })
      }
      // Generate slug from email
      const baseSlug = normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")
      let slug = baseSlug
      let counter = 1
      while (await prisma.user.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          slug,
          emailVerified: new Date(),
          newsletterSubscribed: verificationCode.newsletterOptIn,
        },
      })

      // Convert any pending team invites into memberships (non-fatal).
      await claimTeamInvites(user.id, user.email)

      // Welcome the brand-new user. Non-fatal: never block registration on it.
      try {
        await sendWelcomeEmail(user.id)
      } catch (err) {
        console.error("Failed to send welcome email:", err)
      }
    } else if (!user.emailVerified) {
      // Mark email as verified if not already
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      })
    }

    // Mint a single-use login ticket. This is the only credential the sign-in
    // provider accepts — the client cannot authenticate with an email alone.
    const loginTicket = await issueLoginTicket(normalizedEmail)

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      loginTicket,
    })
  } catch (error) {
    console.error("Verify code error:", error)
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    )
  }
}
