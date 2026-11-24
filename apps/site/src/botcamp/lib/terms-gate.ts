import { prisma } from "@/botcamp/lib/prisma"

/**
 * Whether an OAuth sign-in may proceed, given Terms of Service acceptance.
 *
 * Terms acceptance is required to CREATE an account, and only to create one.
 * The signup page's disabled buttons are a UI affordance, not a control —
 * /api/auth/signin/:provider is reachable directly, and /signin offers the
 * same OAuth buttons with no checkbox — so the gate has to live server-side.
 *
 * Scoped to account creation deliberately: existing users, including everyone
 * who signed up before the ToS existed, must never be locked out of their own
 * account by a checkbox they were never shown. That asymmetry is the whole
 * reason this is a function with tests rather than an inline conditional.
 */
export type TermsGateDecision = "allow" | "reject" | "needs-terms"

export async function oauthTermsGate(params: {
  email: string | null | undefined
  agreedCookie: string | undefined
}): Promise<TermsGateDecision> {
  const email = params.email?.toLowerCase().trim()

  // No email means no way to tell an existing account from a new one, and no
  // way to key one afterwards. Refuse rather than guess.
  if (!email) return "reject"

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing) return "allow"

  return params.agreedCookie === "1" ? "allow" : "needs-terms"
}
