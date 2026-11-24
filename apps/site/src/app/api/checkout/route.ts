import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/botcamp/lib/stripe"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import {
  BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER,
  BUNDLE_PRICE_CENTS,
  BUNDLE_PRODUCT_NAME,
} from "@/botcamp/lib/bundle"
import { STRATEGY_UNLOCK_PRICE_CENTS, hasActiveStrategyUnlock } from "@/botcamp/lib/strategy-access"
import { appUrl } from "@/botcamp/lib/app-url"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to make a purchase" },
        { status: 401 }
      )
    }

    // Get base URL from request origin or env var
    const origin = appUrl()

    const { courseId, cohortId, type } = await request.json()

    if (!courseId && !cohortId && type !== "course-bundle" && type !== "strategy-unlock") {
      return NextResponse.json(
        { error: "Course ID, Cohort ID, or bundle type is required" },
        { status: 400 }
      )
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })

    // Handle Hummingbot Course Bundle checkout — buys lifetime access to
    // every currently-published course AND acts as a Cohort 14 deposit
    // applied in full toward tuition. No DB-side bundle model; the
    // webhook handles enrollment fan-out at success time.
    if (type === "course-bundle") {
      // Idempotency at intent time: if user already paid for the bundle in
      // the past, block re-purchase. We look for any enrollment whose
      // stripePaymentId matches a prior bundle session metadata lookup —
      // but the cheap version is: if they already own all currently
      // published courses for free (pricePaid: 0), they probably already
      // bought a bundle. Surface a friendly error.
      const publishedCount = await prisma.course.count({
        where: { published: true },
      })
      if (publishedCount === 0) {
        return NextResponse.json(
          { error: "No courses available in the bundle right now" },
          { status: 400 }
        )
      }

      const freeEnrollments = await prisma.enrollment.count({
        where: {
          userId: session.user.id,
          courseId: { not: null },
          pricePaid: 0,
        },
      })
      if (freeEnrollments >= publishedCount) {
        return NextResponse.json(
          { error: "You already own every course in the bundle" },
          { status: 400 }
        )
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: user?.email || session.user.email || undefined,
        payment_intent_data: {
          receipt_email: user?.email || session.user.email || undefined,
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: BUNDLE_PRODUCT_NAME,
                description: `Lifetime access to all Botcamp self-paced courses, plus a $400 deposit applied in full toward Cohort ${BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} tuition.`,
              },
              unit_amount: BUNDLE_PRICE_CENTS,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: session.user.id,
          type: "course-bundle",
          targetCohortNumber: String(BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER),
        },
        success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/courses?bundle=canceled`,
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // Handle strategy library unlock — annual subscription, auto-renews
    // every year until canceled. Grants access to every certified strategy's
    // code/resources beyond the free preview set.
    if (type === "strategy-unlock") {
      if (await hasActiveStrategyUnlock(session.user.id)) {
        return NextResponse.json(
          { error: "You already have access to the strategy library" },
          { status: 400 }
        )
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: user?.email || session.user.email || undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Strategy Library Access",
                description: "Unlocks the code and resources for every certified strategy. Renews automatically each year — cancel anytime.",
              },
              recurring: { interval: "year" },
              unit_amount: STRATEGY_UNLOCK_PRICE_CENTS,
            },
            quantity: 1,
          },
        ],
        // Metadata lives on both the session (for checkout.session.completed)
        // and the subscription itself (for the renewal/cancellation webhooks,
        // which receive the Subscription object, not the Checkout Session).
        metadata: {
          userId: session.user.id,
          type: "strategy-unlock",
        },
        subscription_data: {
          metadata: {
            userId: session.user.id,
            type: "strategy-unlock",
          },
        },
        success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/hub?checkout=canceled`,
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // Handle cohort checkout
    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
      })

      if (!cohort) {
        return NextResponse.json({ error: "Cohort not found" }, { status: 404 })
      }

      if (cohort.status !== "UPCOMING") {
        return NextResponse.json(
          { error: "This cohort is not open for enrollment" },
          { status: 400 }
        )
      }

      if (!cohort.price || cohort.price === 0) {
        return NextResponse.json(
          { error: "This cohort has no price set" },
          { status: 400 }
        )
      }

      // Check if already enrolled in this cohort
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          userId: session.user.id,
          cohortId,
        },
      })

      if (existingEnrollment) {
        return NextResponse.json(
          { error: "You are already enrolled in this cohort" },
          { status: 400 }
        )
      }

      // Check if user is an alumni (has previous cohort enrollment)
      const previousCohortEnrollment = await prisma.enrollment.findFirst({
        where: {
          userId: session.user.id,
          cohortId: { not: null },
          // Exclude current cohort
          NOT: { cohortId },
        },
      })

      const isAlumni = !!previousCohortEnrollment
      const alumniCouponId = process.env.STRIPE_ALUMNI_COUPON_ID

      // Check if user has bought 3+ courses (only if not alumni). Only paid
      // enrollments count: a course paid for on its own (pricePaid > 0) or
      // through a purchase (bundle, cohort) — it carries that payment's id.
      // Free courses don't: enrolling in three was a free $600 off.
      let courseEnrollmentCount = 0
      if (!isAlumni) {
        courseEnrollmentCount = await prisma.enrollment.count({
          where: {
            userId: session.user.id,
            courseId: { not: null },
            OR: [{ pricePaid: { gt: 0 } }, { stripePaymentId: { not: null } }],
          },
        })
      }

      const hasMultiCourseDiscount = !isAlumni && courseEnrollmentCount >= 3
      const multiCourseDiscountAmount = 60000 // $600 in cents

      // Calculate final price
      let finalPrice = cohort.price
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as in Botcamp
      let discountConfig: any = {}

      if (isAlumni && alumniCouponId) {
        // Alumni get 65% off via coupon
        discountConfig = { discounts: [{ coupon: alumniCouponId }] }
      } else if (hasMultiCourseDiscount) {
        // 3+ courses get $600 off (applied directly to price)
        finalPrice = Math.max(0, cohort.price - multiCourseDiscountAmount)
        discountConfig = { allow_promotion_codes: true }
      } else {
        // New users can enter promo codes
        discountConfig = { allow_promotion_codes: true }
      }

      // Create Stripe Checkout session for cohort
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        ...discountConfig,
        customer_email: user?.email || session.user.email || undefined,
        payment_intent_data: {
          receipt_email: user?.email || session.user.email || undefined,
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: cohort.title || `Botcamp Cohort ${cohort.number}`,
                description: cohort.description || `Enrollment in Botcamp Cohort ${cohort.number}`,
              },
              unit_amount: finalPrice,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: session.user.id,
          cohortId: cohort.id,
          cohortNumber: String(cohort.number),
          type: "cohort",
        },
        success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cohorts/cohort${cohort.number}?canceled=true`,
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // Handle course checkout
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (!course.published) {
      return NextResponse.json(
        { error: "Course is not available for purchase" },
        { status: 400 }
      )
    }

    if (course.price === 0) {
      return NextResponse.json(
        { error: "This course is free - no payment required" },
        { status: 400 }
      )
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "You are already enrolled in this course" },
        { status: 400 }
      )
    }

    // Create Stripe Checkout session for course
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      customer_email: user?.email || session.user.email || undefined,
      payment_intent_data: {
        receipt_email: user?.email || session.user.email || undefined,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              description: course.description || undefined,
            },
            unit_amount: course.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        courseId: course.id,
        courseSlug: course.slug,
        type: "course",
      },
      success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses/${course.slug}?canceled=true`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
