import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/botcamp/lib/stripe"
import { auth } from "@/botcamp/lib/auth"
import { getLatestStrategyGrant } from "@/botcamp/lib/strategy-access"
import { appUrl } from "@/botcamp/lib/app-url"

// POST /api/billing/portal — creates a Stripe-hosted Customer Portal session
// so a user can manage or cancel their strategy library subscription without
// us building any billing UI of our own.
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 })
    }

    const grant = await getLatestStrategyGrant(session.user.id)
    if (!grant) {
      return NextResponse.json(
        { error: "No strategy library subscription found" },
        { status: 404 }
      )
    }

    if (!grant.stripeCustomerId) {
      return NextResponse.json(
        { error: "This access wasn't purchased through Stripe — there's nothing to manage here" },
        { status: 400 }
      )
    }

    const origin = appUrl()

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: grant.stripeCustomerId,
      return_url: `${origin}/dashboard/profile`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("Failed to create billing portal session:", error)
    return NextResponse.json(
      { error: "Failed to open billing portal" },
      { status: 500 }
    )
  }
}
