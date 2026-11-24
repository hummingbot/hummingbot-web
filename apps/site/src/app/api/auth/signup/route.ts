import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { DISPOSABLE_EMAIL_ERROR, isDisposableEmail } from "@/botcamp/lib/disposable-email"
import { EMAIL_ALIAS_ERROR, mailboxHasAccount } from "@/botcamp/lib/email-alias"
import { sendVerificationEmail } from "@/botcamp/lib/resend"
import { hasControlCharacters } from "@/botcamp/lib/validation"
import { appUrl, safeCallbackUrl } from "@/botcamp/lib/app-url"
import { requestIp } from "@/botcamp/lib/request-ip"
import { CODE_EMAIL_LIMIT_ERROR, MAX_CODE_EMAILS_PER_IP_PER_HOUR, recordCodeEmail } from "@/botcamp/lib/sign-in-code-limit"
import { createMagicLinkToken, generateSignInCode } from "@/botcamp/lib/sign-in-code"
import { rateLimitByIp, rateLimitedResponse } from "@/botcamp/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, newsletter, agreedToTerms, callbackUrl } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    if (agreedToTerms !== true) {
      return NextResponse.json(
        { error: "You must agree to the Terms of Service to sign up" },
        { status: 400 }
      )
    }

    if (!firstName || typeof firstName !== "string" || firstName.trim().length === 0) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      )
    }

    if (!lastName || typeof lastName !== "string" || lastName.trim().length === 0) {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    // Validate email format. Control characters (e.g. a stray null byte from
    // some mobile autofill/paste flows) pass \s but crash Postgres with
    // "invalid byte sequence for encoding UTF8", so they're excluded explicitly.
    const emailRegex = /^[^\s@\x00-\x1F\x7F]+@[^\s@\x00-\x1F\x7F]+\.[^\s@\x00-\x1F\x7F]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    if (hasControlCharacters(trimmedFirstName) || hasControlCharacters(trimmedLastName)) {
      return NextResponse.json(
        { error: "Name contains invalid characters" },
        { status: 400 }
      )
    }

    // Capped per IP before the lookup below answers whether an account
    // exists, so the form can't be used to test addresses by the thousand.
    // Same allowance as code emails per IP — raise both for an in-person event.
    const signupLimit = await rateLimitByIp("signup", request.headers, MAX_CODE_EMAILS_PER_IP_PER_HOUR, 60 * 60 * 1000)
    if (!signupLimit.ok) return rateLimitedResponse(signupLimit)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 400 }
      )
    }

    if (await isDisposableEmail(normalizedEmail)) {
      return NextResponse.json({ error: DISPOSABLE_EMAIL_ERROR }, { status: 400 })
    }
    if (await mailboxHasAccount(normalizedEmail)) {
      return NextResponse.json({ error: EMAIL_ALIAS_ERROR }, { status: 400 })
    }

    // Rate limiting: Check if user requested a code in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: oneMinuteAgo,
        },
      },
    })

    if (recentCode) {
      return NextResponse.json(
        { error: "Please wait a minute before requesting another code" },
        { status: 429 }
      )
    }

    // Rate limiting: Max 3 codes per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCodes = await prisma.verificationCode.count({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    })

    if (recentCodes >= 3) {
      return NextResponse.json(
        { error: "Too many verification requests. Please try again later." },
        { status: 429 }
      )
    }

    // Per IP across addresses, after the per-address checks so a refused
    // request doesn't use up the network's allowance.
    const codeEmail = await recordCodeEmail(requestIp(request.headers))
    if (!codeEmail.ok) {
      return NextResponse.json(
        { error: CODE_EMAIL_LIMIT_ERROR },
        { status: 429, headers: { "Retry-After": String(codeEmail.retryAfterSeconds) } }
      )
    }

    // Clean up expired codes for this email
    await prisma.verificationCode.deleteMany({
      where: {
        email: normalizedEmail,
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    // Generate new code
    const code = generateSignInCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store code with name info
    await prisma.verificationCode.create({
      data: {
        email: normalizedEmail,
        code,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        newsletterOptIn: newsletter === true,
        termsAccepted: true,
        expiresAt,
      },
    })

    // Clean up expired NextAuth verification tokens
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: normalizedEmail,
        expires: {
          lt: new Date(),
        },
      },
    })

    // The magic link's token. Only its hash is stored.
    const { token: magicLinkToken, tokenHash } = createMagicLinkToken()

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: tokenHash,
        expires: expiresAt,
      },
    })

    const origin = appUrl()
    // Where the person was headed (a deep dashboard link, Condor's /connect), so
    // the email's link brings them back there; only paths on this site pass.
    const next = safeCallbackUrl(typeof callbackUrl === "string" ? callbackUrl : null)
    const magicLink = `${origin}/api/auth/callback/email?token=${magicLinkToken}&email=${encodeURIComponent(normalizedEmail)}&callbackUrl=${encodeURIComponent(next)}`

    // Send email with verification link
    const emailResult = await sendVerificationEmail({
      to: normalizedEmail,
      code,
      magicLink,
      userName: trimmedFirstName,
      isNewUser: true,
    })

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error)
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    )
  }
}
