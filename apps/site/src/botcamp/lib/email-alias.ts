import { prisma } from "@/botcamp/lib/prisma"

// The mailbox an address delivers to: "+tag" suffixes dropped (every major
// provider ignores them), and for Gmail the dots in the local part too, with
// googlemail.com read as gmail.com. jadenwu39+wv70d@gmail.com and
// jaden.wu39@googlemail.com are both jadenwu39@gmail.com.
const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"]

export function canonicalMailbox(email: string): string {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@")
  const base = local.replace(/\+.*$/, "")
  return GMAIL_DOMAINS.includes(domain) ? `${base.replace(/\./g, "")}@gmail.com` : `${base}@${domain}`
}

/**
 * Whether a new account at `email` would be a second account on a mailbox
 * that already has one — another "+tag" or dot spelling of the same inbox,
 * which is how one person makes many accounts (2026-10-29). Only new accounts
 * are checked; existing ones keep signing in with the address they have.
 */
export async function mailboxHasAccount(email: string): Promise<boolean> {
  const mailbox = canonicalMailbox(email)
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT 1 FROM users
    WHERE CASE
      WHEN split_part(lower(email), '@', 2) IN ('gmail.com', 'googlemail.com')
        THEN replace(regexp_replace(split_part(lower(email), '@', 1), '\\+.*$', ''), '.', '') || '@gmail.com'
      ELSE regexp_replace(split_part(lower(email), '@', 1), '\\+.*$', '') || '@' || split_part(lower(email), '@', 2)
    END = ${mailbox}
    LIMIT 1`
  return rows.length > 0
}

export const EMAIL_ALIAS_ERROR =
  "This address is another spelling of an email that already has a Botcamp account — sign in with that address instead"
