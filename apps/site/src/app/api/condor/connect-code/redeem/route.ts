import { NextRequest, NextResponse } from "next/server"
import { MAX_REDEEMS_PER_IP, REDEEM_WINDOW_SECONDS, redeemConnectCode } from "@/botcamp/lib/connect-code"
import { sendCondorConnectedEmail } from "@/botcamp/lib/notifications"
import { rateLimitByIp } from "@/botcamp/lib/rate-limit"
import { requestIp } from "@/botcamp/lib/request-ip"

// POST /api/condor/connect-code/redeem - Condor trades the code the person
// pasted for a token. Body: { code, client_name? }. Answers once with the
// same shape the old device flow used for its token, after which the code is
// spent; the person is emailed. Anonymous, so capped per IP against guessing.
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const limited = await rateLimitByIp(
      "condor-connect-redeem",
      request.headers,
      MAX_REDEEMS_PER_IP,
      REDEEM_WINDOW_SECONDS * 1000,
    )
    if (!limited.ok) {
      return NextResponse.json(
        { error: "slow_down", error_description: "Too many attempts — wait a few minutes" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      )
    }

    const body = (await request.json().catch(() => ({}))) as { code?: unknown; client_name?: unknown }
    if (typeof body.code !== "string" || !body.code.trim()) {
      return NextResponse.json({ error: "invalid_request", error_description: "Send the code as `code`" }, { status: 400 })
    }
    const clientName =
      (typeof body.client_name === "string" ? body.client_name.trim().slice(0, 100) : "") || "Condor"
    const ip = requestIp(request.headers)

    const result = await redeemConnectCode(body.code, clientName, ip)
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          error_description:
            result.error === "too_many_connections"
              ? "This account has too many Condor connections — disconnect one in Botcamp's profile, Condor tab"
              : "That code is wrong, expired or already used — generate a new one at Botcamp's /connect",
        },
        { status: 400 },
      )
    }

    await sendCondorConnectedEmail(result.user.id, { clientName, requesterIp: ip })
    return NextResponse.json(
      {
        access_token: result.token,
        token_type: "bearer",
        scope: result.scopes.join(" "),
        expires_in: Math.floor((result.expiresAt.getTime() - Date.now()) / 1000),
        expires_at: result.expiresAt.toISOString(),
        user: result.user,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Error redeeming Condor connect code:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
