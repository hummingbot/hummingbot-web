// The community-maintained list of throwaway-inbox domains. It's the one that
// stays current: the 2026-10-29 probes used maxxspace.com, which this list
// carries and the `disposable-email-domains` npm package (last published
// 2022) doesn't. Next's data cache keeps a copy and refreshes it daily, so a
// sign-up doesn't wait on GitHub.
export const DISPOSABLE_DOMAINS_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf"

// Throwaway services the community list doesn't carry yet, seen in use
// against Botcamp. ethereal.email is Nodemailer's fake SMTP inbox (2026-10-29).
const EXTRA_DISPOSABLE_DOMAINS = ["ethereal.email"]

async function disposableDomains(): Promise<Set<string>> {
  const res = await fetch(DISPOSABLE_DOMAINS_URL, { next: { revalidate: 24 * 60 * 60 } })
  if (!res.ok) {
    throw new Error(`Couldn't load the disposable email domain list (${res.status} from ${DISPOSABLE_DOMAINS_URL})`)
  }
  const domains = (await res.text())
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith("#"))
  if (domains.length < 1000) {
    throw new Error(`The disposable email domain list from ${DISPOSABLE_DOMAINS_URL} has only ${domains.length} entries`)
  }
  return new Set([...domains, ...EXTRA_DISPOSABLE_DOMAINS])
}

/** Whether `email` is at a throwaway-inbox domain, or a subdomain of one. */
export async function isDisposableEmail(email: string): Promise<boolean> {
  const domain = email.trim().toLowerCase().split("@").pop() ?? ""
  if (!domain) return false
  const domains = await disposableDomains()
  const labels = domain.split(".")
  for (let i = 0; i < labels.length - 1; i++) {
    if (domains.has(labels.slice(i).join("."))) return true
  }
  return false
}

export const DISPOSABLE_EMAIL_ERROR = "Please use a permanent email address — temporary inboxes can't be used on Botcamp"
