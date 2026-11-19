import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"
import { prisma } from "@/botcamp/lib/prisma"

/**
 * The secrets in a sign-in email: the 6-digit code and the magic-link token.
 *
 * Both used to come from Math.random, which isn't a secure generator: V8's
 * xorshift128+ state can be recovered from a handful of outputs, and every
 * magic link we mailed carried two of them (the code and a raw Math.random
 * string, base64-encoded — not encrypted). Anyone requesting codes for their
 * own inbox could work out the codes and links the same server instance would
 * mail to someone else next. They come from node:crypto now, and the magic
 * link no longer contains the code.
 */

export const MAX_VERIFY_ATTEMPTS = 5

export function generateSignInCode(): string {
  return randomInt(100000, 1000000).toString()
}

/** sha256 of a magic-link token. Only the hash is stored. */
export function hashMagicLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * A fresh magic-link token: `token` goes in the email, `tokenHash` in the
 * database, so a leaked verification_tokens row can't be used as a link.
 */
export function createMagicLinkToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashMagicLinkToken(token) }
}

export function codesMatch(expected: string, given: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(given)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Counts one guess against a code, or returns false once it has had
 * MAX_VERIFY_ATTEMPTS. The check and the increment are one UPDATE, so parallel
 * guesses can't all read "4 attempts" and each get a try.
 */
export async function claimVerifyAttempt(codeId: string): Promise<boolean> {
  const { count } = await prisma.verificationCode.updateMany({
    where: { id: codeId, attempts: { lt: MAX_VERIFY_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  })
  return count > 0
}
