/**
 * Whether the email an OAuth provider handed us is one the person has proved
 * they own.
 *
 * Google and GitHub sign-ins are linked to an existing account by email
 * (`allowDangerousEmailAccountLinking`), so that email is the whole proof of
 * identity. GitHub lets anyone add an address to their account without
 * confirming it, and Auth.js's GitHub provider takes the primary address from
 * /user/emails without looking at `verified` — so an unconfirmed
 * victim@example.com on an attacker's GitHub account opened the victim's
 * Botcamp account. A new account is refused too: one created on someone
 * else's address would be theirs to sign into later, and the attacker's too.
 *
 * Called from the signIn callback, which Auth.js runs before it links or
 * creates anything.
 */

import { prisma } from "@/botcamp/lib/prisma"

interface GitHubEmail {
  email: string
  verified: boolean
}

export async function isVerifiedOAuthEmail(params: {
  provider: string
  email: string | null | undefined
  profile: Record<string, unknown> | undefined
  accessToken: string | undefined
  fetchImpl?: typeof fetch
}): Promise<boolean> {
  const email = params.email?.toLowerCase().trim()
  if (!email) return false

  if (params.provider === "google") {
    return params.profile?.email_verified === true
  }

  if (params.provider === "github") {
    if (!params.accessToken) return false
    const res = await (params.fetchImpl ?? fetch)("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "botcamp",
      },
    })
    if (!res.ok) return false
    const emails = (await res.json()) as GitHubEmail[]
    return Array.isArray(emails) && emails.some((e) => e.verified === true && e.email?.toLowerCase() === email)
  }

  return false
}

/**
 * Whether the browser is already signed in to a Botcamp account other than
 * the one this OAuth email belongs to. Auth.js links a new Google or GitHub
 * account to whoever is signed in, so after a login CSRF (the victim signed
 * into the attacker's account by a link) one click on "Sign in with Google"
 * would give the attacker a lasting sign-in to the victim's Google identity.
 * The signIn callback refuses when this is true.
 */
export async function isSignedInAsSomeoneElse(
  sessionUserId: string | null | undefined,
  oauthEmail: string | null | undefined,
  oauthAccount?: { provider: string; providerAccountId: string },
): Promise<boolean> {
  if (!sessionUserId) return false
  // Already linked to this very user (its Google email may differ, or have
  // changed since): Auth.js maps it by account id, nothing new gets linked.
  if (oauthAccount) {
    const linked = await prisma.account.findUnique({
      where: { provider_providerAccountId: oauthAccount },
      select: { userId: true },
    })
    if (linked?.userId === sessionUserId) return false
  }
  const signedIn = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { email: true } })
  if (!signedIn) return false
  return signedIn.email.toLowerCase().trim() !== (oauthEmail ?? "").toLowerCase().trim()
}
