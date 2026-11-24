import { ipLimitKey } from "@/botcamp/lib/request-ip"
import { rateLimit, type RateLimitResult } from "@/botcamp/lib/rate-limit"

// Sign-in and sign-up code emails per IP over a rolling hour. The per-address
// limits in request-code/signup don't stop one source from mailing a code to
// any number of addresses — making accounts by the dozen (the 2026-10-29
// probe made 18), or using Botcamp's sender to flood other people's inboxes.
// Raise it for an in-person event, where everyone signs up from one Wi-Fi.
export const MAX_CODE_EMAILS_PER_IP_PER_HOUR = 20
const WINDOW_MS = 60 * 60 * 1000

/**
 * Records a code email against its IP, or says when that IP may ask again
 * (see rateLimit). IPv6 callers are counted by their /64. Without a proxy IP
 * (local dev) nothing is capped.
 */
export async function recordCodeEmail(ip: string | null): Promise<RateLimitResult> {
  if (!ip) return { ok: true }
  return rateLimit(`sign-in-code:ip:${ipLimitKey(ip)}`, MAX_CODE_EMAILS_PER_IP_PER_HOUR, WINDOW_MS)
}

export const CODE_EMAIL_LIMIT_ERROR = "Too many sign-in codes requested from your network — try again later"
