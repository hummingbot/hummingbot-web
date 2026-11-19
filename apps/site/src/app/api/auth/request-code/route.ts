import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { DISPOSABLE_EMAIL_ERROR, isDisposableEmail } from "@/botcamp/lib/disposable-email"
import { EMAIL_ALIAS_ERROR, mailboxHasAccount } from "@/botcamp/lib/email-alias"
import { sendVerificationEmail } from "@/botcamp/lib/resend"
import { appUrl, safeCallbackUrl } from "@/botcamp/lib/app-url"
import { requestIp } from "@/botcamp/lib/request-ip"
import { CODE_EMAIL_LIMIT_ERROR, recordCodeEmail } from "@/botcamp/lib/sign-in-code-limit"
import { createMagicLinkToken, generateSignInCode } from "@/botcamp/lib/sign-in-code"

export async function POST(request: NextRequest) {
  try {
    const { email, callbackUrl } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

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

    // A new account can't be made with a throwaway inbox; an existing one
    // still signs in with whatever address it has.
    const existingAccount = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } })
    if (!existingAccount && (await isDisposableEmail(normalizedEmail))) {
      return NextResponse.json({ error: DISPOSABLE_EMAIL_ERROR }, { status: 400 })
    }
    if (!existingAccount && (await mailboxHasAccount(normalizedEmail))) {
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

    // Store code in our custom table for manual code entry
    await prisma.verificationCode.create({
      data: {
        email: normalizedEmail,
        code,
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, firstName: true },
    })

    const origin = appUrl()
    // Where the person was headed (a deep dashboard link, Condor's /connect), so
    // the email's link brings them back there; only paths on this site pass.
    const next = safeCallbackUrl(typeof callbackUrl === "string" ? callbackUrl : null)
    const magicLink = `${origin}/api/auth/callback/email?token=${magicLinkToken}&email=${encodeURIComponent(normalizedEmail)}&callbackUrl=${encodeURIComponent(next)}`

    // Send email with both magic link and code
    const emailResult = await sendVerificationEmail({
      to: normalizedEmail,
      code,
      magicLink,
      userName: user?.firstName || user?.name || undefined,
      isNewUser: !user,
    })

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error)
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification code" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
    })
  } catch (error) {
    console.error("Request code error:", error)
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    )
  }
}
