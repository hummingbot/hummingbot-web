import { NextRequest } from "next/server"

// Browsers post Content-Security-Policy-Report-Only violations here (see
// next.config.mjs). Logged, compactly, for the week the policy is watched
// before it's enforced. Anyone can post, so the body is capped and nothing
// is stored.
const MAX_REPORT_BYTES = 8 * 1024

// Reads at most `max` bytes of the body, then stops reading.
async function readCapped(request: NextRequest, max: number): Promise<string> {
  if (!request.body) return ""
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (size <= max) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
  }
  await reader.cancel().catch(() => {})
  return Buffer.concat(chunks).subarray(0, max).toString("utf8")
}

export async function POST(request: NextRequest) {
  const text = await readCapped(request, MAX_REPORT_BYTES)
  try {
    const body = JSON.parse(text)
    const report = body?.["csp-report"] ?? body?.[0]?.body ?? body
    console.warn(
      "[CSP report-only]",
      JSON.stringify({
        blocked: report?.["blocked-uri"] ?? report?.blockedURL,
        directive: report?.["violated-directive"] ?? report?.effectiveDirective,
        page: report?.["document-uri"] ?? report?.documentURL,
      }),
    )
  } catch {
    // Not a report; nothing to log
  }
  return new Response(null, { status: 204 })
}
