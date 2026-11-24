import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual, createHmac } from "crypto"
import { prisma } from "@/botcamp/lib/prisma"

/**
 * Verifies a Resend webhook request using the Svix signature scheme Resend
 * signs its webhooks with: https://resend.com/docs/dashboard/webhooks/verify-with-svix
 *
 * `secret` is the `whsec_...` signing secret from the Resend webhook config.
 */
function verifySignature(params: {
  secret: string
  svixId: string
  svixTimestamp: string
  svixSignature: string
  body: string
}): boolean {
  const { secret, svixId, svixTimestamp, svixSignature, body } = params

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const signedContent = `${svixId}.${svixTimestamp}.${body}`
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64")

  return svixSignature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter(Boolean)
    .some((candidate) => {
      const candidateBuf = Buffer.from(candidate, "base64")
      const expectedBuf = Buffer.from(expected, "base64")
      return (
        candidateBuf.length === expectedBuf.length &&
        timingSafeEqual(candidateBuf, expectedBuf)
      )
    })
}

// Only fires the first time an event of this kind lands for a Notification —
// re-deliveries or a later duplicate event must not clobber the original
// timestamp (e.g. a second "opened" webhook shouldn't overwrite the first).
async function markOnce(resendEmailId: string, field: "deliveredAt" | "openedAt" | "clickedAt" | "bouncedAt" | "deliveryDelayedAt" | "complainedAt", at: Date) {
  await prisma.notification.updateMany({
    where: { resendEmailId, [field]: null },
    data: { [field]: at },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.warn("RESEND_WEBHOOK_SECRET not set - rejecting webhook")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 })
  }

  // Reject old timestamps even with a valid signature, so a leaked/logged
  // payload can't be replayed later to forge delivery/open/click events.
  const TOLERANCE_SECONDS = 5 * 60
  const timestampSeconds = Number(svixTimestamp)
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > TOLERANCE_SECONDS
  ) {
    return NextResponse.json({ error: "Timestamp out of tolerance" }, { status: 400 })
  }

  if (!verifySignature({ secret, svixId, svixTimestamp, svixSignature, body })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let event: { type: string; created_at: string; data: { email_id: string } }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const emailId = event.data?.email_id
  if (!emailId) {
    return NextResponse.json({ received: true })
  }

  const at = new Date(event.created_at)

  switch (event.type) {
    case "email.delivered":
      await markOnce(emailId, "deliveredAt", at)
      break
    case "email.opened":
      await markOnce(emailId, "openedAt", at)
      break
    case "email.clicked":
      await markOnce(emailId, "clickedAt", at)
      break
    case "email.bounced":
      await markOnce(emailId, "bouncedAt", at)
      break
    case "email.delivery_delayed":
      await markOnce(emailId, "deliveryDelayedAt", at)
      break
    case "email.complained":
      await markOnce(emailId, "complainedAt", at)
      break
    default:
      // email.sent, etc. — not tracked
      break
  }

  return NextResponse.json({ received: true })
}
