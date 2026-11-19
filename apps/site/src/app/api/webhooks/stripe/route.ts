import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { stripe } from "@/botcamp/lib/stripe"
import { prisma } from "@/botcamp/lib/prisma"
import { fulfillCheckout, revokePayment } from "@/botcamp/lib/checkout-fulfillment"
import { STRATEGY_UNLOCK_DURATION_DAYS } from "@/botcamp/lib/strategy-access"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set - refusing to process webhook")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing signature header" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log(`Received Stripe event: ${event.type}`)

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    // Shared with the success redirect; once per session (checkout-fulfillment.ts)
    const { outcome } = await fulfillCheckout(session)
    if (outcome === "invalid") {
      console.error("Missing metadata in checkout session:", session.id)
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
    }
    console.log(`Checkout session ${session.id}: ${outcome}`)
  }

  // A full refund or a dispute takes back what the payment granted. A
  // partial refund leaves access alone. Both events must be enabled on the
  // webhook endpoint in the Stripe dashboard.
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id
    if (charge.refunded && paymentIntentId) {
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id
      const { removedEnrollments } = await revokePayment(paymentIntentId, customerId)
      console.log(`Refund of ${paymentIntentId}: removed ${removedEnrollments} enrollment(s)`)
    }
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute
    const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id
    if (paymentIntentId) {
      // The event carries the charge's id; its customer marks a subscription
      const charge = typeof dispute.charge === "string" ? await stripe.charges.retrieve(dispute.charge) : dispute.charge
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id
      const { removedEnrollments } = await revokePayment(paymentIntentId, customerId)
      console.log(`Dispute on ${paymentIntentId}: removed ${removedEnrollments} enrollment(s)`)
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    console.error("Payment failed:", paymentIntent.id, paymentIntent.last_payment_error?.message)
  }

  // Fires on renewal (current_period_end/status change after a paid invoice)
  // and on any other subscription change, including scheduling a
  // cancel-at-period-end. Metadata comes from `subscription_data.metadata`
  // set at checkout, not the Checkout Session itself.
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription
    if (subscription.metadata?.type === "strategy-unlock") {
      const currentPeriodEnd = subscription.items.data[0]?.current_period_end
      let expiresAt: Date
      if (currentPeriodEnd) {
        expiresAt = new Date(currentPeriodEnd * 1000)
      } else {
        // Defensive fallback — shouldn't happen, Stripe always includes the
        // subscription's item on this event.
        expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + STRATEGY_UNLOCK_DURATION_DAYS)
      }

      await prisma.strategyAccessGrant.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          expiresAt,
        },
      })

      console.log(
        `Updated strategy unlock subscription ${subscription.id}: status=${subscription.status}, cancelAtPeriodEnd=${subscription.cancel_at_period_end}, expiresAt=${expiresAt.toISOString()}`
      )
    }
  }

  // Fires when a subscription is fully removed (immediate cancellation, or
  // Stripe finalizing a scheduled cancel-at-period-end). Mark it canceled;
  // `expiresAt` is left as-is since it already reflects the last paid period.
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    if (subscription.metadata?.type === "strategy-unlock") {
      await prisma.strategyAccessGrant.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: "canceled", cancelAtPeriodEnd: false },
      })
      console.log(`Strategy unlock subscription ${subscription.id} canceled`)
    }
  }

  return NextResponse.json({ received: true })
}
