// The site's own address, for links we send out (sign-in emails, Stripe
// redirects). Never taken from a request header: a sign-in link built from
// the caller's Origin let anyone have Botcamp email someone else a genuine
// sign-in link that pointed at their own server, token included — one click
// handed over the account (security review of 2026-10-29).
export function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set — it's the address used for links in emails and redirects")
  }
  return url.replace(/\/+$/, "")
}

const CALLBACK_BASE = "https://callback.invalid"

// Where to send someone after sign-in, from a `callbackUrl` query param.
// Only paths on this site pass: router.push runs a `javascript:` URL as
// script on our origin, and an absolute or protocol-relative URL ("//x",
// "/\x", tabs the URL parser strips) sends a freshly signed-in user to a
// phishing page. Parsing with the same rules the browser uses catches those
// variants instead of guessing at prefixes.
export function safeCallbackUrl(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/")) return fallback
  try {
    const url = new URL(value, CALLBACK_BASE)
    if (url.origin !== CALLBACK_BASE) return fallback
    // Dot segments can normalize a same-site input into a protocol-relative
    // path ("/.//evil.com" -> "//evil.com"), so check what we hand back too.
    const path = `${url.pathname}${url.search}${url.hash}`
    if (path.startsWith("//") || new URL(path, CALLBACK_BASE).origin !== CALLBACK_BASE) return fallback
    return path
  } catch {
    return fallback
  }
}
