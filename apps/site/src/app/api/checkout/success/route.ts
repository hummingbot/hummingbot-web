import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/botcamp/lib/stripe"
import { fulfillCheckout, readCheckoutMetadata, type CheckoutMetadata } from "@/botcamp/lib/checkout-fulfillment"

// The redirect only has to beat the webhook right after checkout. Sessions
// fulfilled before CheckoutFulfillment existed have no row to stop a replay,
// so an older one is never fulfilled here — the webhook already did it. An
// hour covers a slow return from Stripe and keeps that replay window short.
const SUCCESS_WINDOW_SECONDS = 60 * 60

function destination(metadata: CheckoutMetadata): string {
  if (metadata.type === "course-bundle") return "/dashboard?purchase=bundle"
  if (metadata.type === "strategy-unlock") return "/hub?unlocked=1"
  if (metadata.type === "cohort") return `/cohorts/cohort${metadata.cohortNumber}/learn`
  return `/courses/${metadata.courseSlug}/learn`
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.redirect(new URL("/education?error=missing_session", request.url))
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge"],
    })

    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.redirect(new URL("/education?error=payment_incomplete", request.url))
    }

    const metadata = readCheckoutMetadata(session)
    if (!metadata) {
      console.error("Missing metadata in checkout session:", sessionId)
      return NextResponse.redirect(new URL("/education?error=invalid_session", request.url))
    }

    // Refunded or disputed since: the webhook takes the access back, so an
    // old URL must never grant it again.
    const paymentIntent = typeof session.payment_intent === "object" ? session.payment_intent : null
    const charge = typeof paymentIntent?.latest_charge === "object" ? paymentIntent.latest_charge : null
    if (charge && (charge.refunded || charge.disputed)) {
      return NextResponse.redirect(new URL("/education?error=payment_refunded", request.url))
    }

    if (Date.now() / 1000 - session.created < SUCCESS_WINDOW_SECONDS) {
      const { outcome } = await fulfillCheckout(session)
      if (outcome === "revoked") {
        return NextResponse.redirect(new URL("/education?error=payment_refunded", request.url))
      }
    }

    return NextResponse.redirect(new URL(destination(metadata), request.url))
  } catch (error) {
    console.error("Checkout success error:", error)
    return NextResponse.redirect(new URL("/education?error=verification_failed", request.url))
  }
}
