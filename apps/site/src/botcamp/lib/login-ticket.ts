import { prisma } from "@/botcamp/lib/prisma"

/**
 * Single-use login tickets.
 *
 * The passwordless sign-in flow proves email ownership out-of-band (a 6-digit
 * code or a magic link). Once that proof succeeds server-side, we mint a login
 * ticket and hand it to the client, which passes it to `signIn("credentials")`.
 * The credentials provider's `authorize()` consumes the ticket and refuses to
 * create a session without one.
 *
 * This is the security boundary for the whole site: possession of a valid,
 * unexpired, unconsumed ticket — NOT merely knowing an email address — is what
 * authenticates a user. Tickets are stored in the NextAuth `VerificationToken`
 * table under a namespaced identifier so they never collide with magic-link
 * tokens.
 */

const TICKET_TTL_MS = 5 * 60 * 1000 // 5 minutes — enough to cover the redirect
const TICKET_PREFIX = "login-ticket:"

function identifierFor(email: string): string {
  return `${TICKET_PREFIX}${email.toLowerCase().trim()}`
}

/**
 * Mint a single-use login ticket for an email whose ownership has just been
 * verified. Returns the opaque ticket token to hand to the client.
 */
export async function issueLoginTicket(email: string): Promise<string> {
  // `crypto.randomUUID` is a runtime global in both Node and Edge; two UUIDs
  // give ~244 bits of entropy with no Node-only imports (this module is reached
  // from `auth`, which the middleware bundles).
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "")

  await prisma.verificationToken.create({
    data: {
      identifier: identifierFor(email),
      token,
      expires: new Date(Date.now() + TICKET_TTL_MS),
    },
  })

  return token
}

/**
 * Atomically validate and consume a login ticket. Returns true only if a
 * matching, unexpired ticket existed; the delete makes it single-use so a
 * captured ticket cannot be replayed.
 */
export async function consumeLoginTicket(
  email: string,
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false

  const { count } = await prisma.verificationToken.deleteMany({
    where: {
      identifier: identifierFor(email),
      token,
      expires: { gt: new Date() },
    },
  })

  return count > 0
}
