import Stripe from "stripe"
import { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { stripe } from "@/botcamp/lib/stripe"
import { sendPurchaseConfirmation } from "@/botcamp/lib/notifications"
import { BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER } from "@/botcamp/lib/bundle"
import { updateUserMembershipStatus } from "@/botcamp/lib/enrollment-utils"
import { STRATEGY_UNLOCK_DURATION_DAYS, grantStrategyAccessFromCoursePurchase } from "@/botcamp/lib/strategy-access"

/**
 * Turning a paid Stripe Checkout Session into access, and taking it back.
 *
 * The webhook (checkout.session.completed) and the success redirect
 * (/api/checkout/success) both fulfill, whichever comes first. They used to
 * carry their own copies of this, which had drifted (only the webhook granted
 * strategy access for a course purchase), and both decided "already done" by
 * looking for the enrollment — so once an admin removed someone's access,
 * reopening the old success URL enrolled them again. A CheckoutFulfillment row
 * now marks each session done, inside the same transaction as the grants.
 *
 * Refunds and disputes (revokePayment) remove what the payment granted.
 */

export type CheckoutType = "course-bundle" | "strategy-unlock" | "cohort" | "course"

export interface CheckoutMetadata {
  type: CheckoutType
  userId: string
  courseId?: string
  courseSlug?: string
  cohortId?: string
  cohortNumber?: string
}

export type FulfillmentOutcome =
  | { outcome: "fulfilled" | "already"; metadata: CheckoutMetadata }
  | { outcome: "unpaid" | "revoked" | "invalid"; metadata: CheckoutMetadata | null }

export function readCheckoutMetadata(session: Stripe.Checkout.Session): CheckoutMetadata | null {
  const { userId, courseId, courseSlug, cohortId, cohortNumber, type } = session.metadata || {}
  if (!userId) return null
  if (type === "course-bundle" || type === "strategy-unlock") return { type, userId }
  if (type === "cohort") return cohortId ? { type, userId, cohortId, cohortNumber } : null
  // Course checkouts predate `type`
  return courseId ? { type: "course", userId, courseId, courseSlug } : null
}

function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false
  return field === undefined || String(error.meta?.target ?? "").includes(field)
}

/** Grants a paid session's access once. Safe to call from both entry points. */
export async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<FulfillmentOutcome> {
  const metadata = readCheckoutMetadata(session)
  if (!metadata) return { outcome: "invalid", metadata: null }
  // A 100% promo code (or a discount down to $0) completes the session with
  // nothing to pay: "no_payment_required", and no payment intent.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { outcome: "unpaid", metadata }
  }

  const paymentIntentId = stripeId(session.payment_intent)
  // A refund or dispute that landed before we fulfilled
  if (paymentIntentId) {
    const revoked = await prisma.checkoutFulfillment.findFirst({
      where: { paymentIntentId, revokedAt: { not: null } },
      select: { id: true },
    })
    if (revoked) return { outcome: "revoked", metadata }
  }

  const amount = session.amount_total || 0
  let fulfillmentId: string

  try {
    fulfillmentId = await prisma.$transaction(async (tx) => {
      // Claimed first: a second caller hits the unique index and stops here
      const fulfillment = await tx.checkoutFulfillment.create({
        data: { checkoutSessionId: session.id, paymentIntentId, userId: metadata.userId, type: metadata.type },
      })
      const created: string[] = []
      const courseIds: string[] = []
      const enroll = async (data: { courseId?: string; cohortId?: string; stripePaymentId: string | null; pricePaid: number }) => {
        if (data.courseId) courseIds.push(data.courseId)
        const where = data.courseId
          ? { userId_courseId: { userId: metadata.userId, courseId: data.courseId } }
          : { userId_cohortId: { userId: metadata.userId, cohortId: data.cohortId! } }
        if (await tx.enrollment.findUnique({ where, select: { id: true } })) return
        const enrollment = await tx.enrollment.create({ data: { userId: metadata.userId, ...data }, select: { id: true } })
        created.push(enrollment.id)
      }
      const publishedCourses = () => tx.course.findMany({ where: { published: true }, select: { id: true } })

      if (metadata.type === "course-bundle") {
        // Every course published at the moment of purchase (snapshot).
        for (const course of await publishedCourses()) {
          await enroll({ courseId: course.id, stripePaymentId: paymentIntentId, pricePaid: 0 })
        }
        await tx.user.updateMany({
          where: { id: metadata.userId, bundleDepositAt: null },
          data: { bundleDepositCohortNumber: BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER, bundleDepositAt: new Date() },
        })
      } else if (metadata.type === "strategy-unlock") {
        // Seed value — customer.subscription.updated sets the real period end.
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + STRATEGY_UNLOCK_DURATION_DAYS)
        const subscriptionId = stripeId(session.subscription)
        const existing = subscriptionId
          ? await tx.strategyAccessGrant.findUnique({ where: { stripeSubscriptionId: subscriptionId }, select: { id: true } })
          : null
        if (!existing) {
          await tx.strategyAccessGrant.create({
            data: {
              userId: metadata.userId,
              stripeCustomerId: stripeId(session.customer),
              stripeSubscriptionId: subscriptionId,
              status: "active",
              pricePaid: amount,
              expiresAt,
            },
          })
        }
      } else if (metadata.type === "cohort") {
        await enroll({ cohortId: metadata.cohortId, stripePaymentId: paymentIntentId, pricePaid: amount })
        // Included courses: no payment id of their own (education/page.tsx
        // counts bundle deposits by it), tracked through enrollmentIds.
        for (const course of await publishedCourses()) {
          await enroll({ courseId: course.id, stripePaymentId: null, pricePaid: 0 })
        }
        await tx.user.update({ where: { id: metadata.userId }, data: { isMember: true } })
      } else {
        await enroll({ courseId: metadata.courseId, stripePaymentId: paymentIntentId, pricePaid: amount })
      }

      await tx.checkoutFulfillment.update({ where: { id: fulfillment.id }, data: { enrollmentIds: created, courseIds } })
      return fulfillment.id
    })
  } catch (error) {
    // Only our own claim means "already done". Any other conflict (say, an
    // enrollment written by a parallel purchase) is thrown, so Stripe retries.
    if (!isUniqueViolation(error, "checkoutSessionId")) throw error
    // Claimed, but a crash may have cut the steps after the claim short.
    // Stripe's retry lands here, and finishes them.
    const claimed = await prisma.checkoutFulfillment.findUnique({
      where: { checkoutSessionId: session.id },
      select: { id: true, completedAt: true, revokedAt: true },
    })
    if (claimed && !claimed.completedAt && !claimed.revokedAt) {
      await completeFulfillment(session, metadata, claimed.id, { retry: true })
    }
    return { outcome: "already", metadata }
  }

  await completeFulfillment(session, metadata, fulfillmentId, { retry: false })
  return { outcome: "fulfilled", metadata }
}

/**
 * The steps after the claim. They sit outside its transaction (an email can't
 * roll back), so they're safe to run twice: the grant checks for an existing
 * one, and Resend dedupes the email's idempotency key.
 */
async function completeFulfillment(
  session: Stripe.Checkout.Session,
  metadata: CheckoutMetadata,
  fulfillmentId: string,
  { retry }: { retry: boolean },
): Promise<void> {
  const courseGrantsStrategyAccess = metadata.type === "course" && (session.amount_total || 0) > 0
  const granted = courseGrantsStrategyAccess && (await grantStrategyAccessFromCoursePurchase(metadata.userId))
  // On a retry the grant may already exist from the cut-short attempt
  await sendConfirmation(session, metadata, granted || (retry && courseGrantsStrategyAccess))
  await prisma.checkoutFulfillment.update({ where: { id: fulfillmentId }, data: { completedAt: new Date() } })
}

async function sendConfirmation(
  session: Stripe.Checkout.Session,
  metadata: CheckoutMetadata,
  grantedStrategyAccess: boolean,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const amountCents = session.amount_total || 0
  const paymentIntentId = stripeId(session.payment_intent)

  if (metadata.type === "course-bundle") {
    await sendPurchaseConfirmation({
      userId: metadata.userId,
      courseName: "Hummingbot Course Bundle",
      courseUrl: `${appUrl}/dashboard/enrollments`,
      amountCents,
      idempotencyKey: `bundle-confirmation-${paymentIntentId}`,
      notificationType: "COURSE_ENROLLED",
      note: `Your deposit will be applied in full toward your Cohort ${BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} tuition once enrollment opens.`,
    })
  } else if (metadata.type === "strategy-unlock") {
    const renews = new Date()
    renews.setDate(renews.getDate() + STRATEGY_UNLOCK_DURATION_DAYS)
    await sendPurchaseConfirmation({
      userId: metadata.userId,
      courseName: "Strategy Library Access",
      courseUrl: `${appUrl}/hub`,
      amountCents,
      idempotencyKey: `strategy-unlock-confirmation-${stripeId(session.subscription)}`,
      notificationType: "STRATEGY_UPDATE",
      note: `This renews automatically each year (next charge around ${renews.toLocaleDateString()}) — manage or cancel anytime from your account settings.`,
    })
  } else if (metadata.type === "cohort") {
    const cohort = await prisma.cohort.findUnique({
      where: { id: metadata.cohortId },
      select: { title: true, number: true },
    })
    await sendPurchaseConfirmation({
      userId: metadata.userId,
      courseName: cohort?.title || `Botcamp Cohort ${cohort?.number ?? metadata.cohortNumber}`,
      courseUrl: `${appUrl}/cohorts/cohort${metadata.cohortNumber}/learn`,
      amountCents,
      idempotencyKey: `purchase-confirmation-${paymentIntentId}`,
      notificationType: "COHORT_ENROLLED",
    })
  } else {
    const course = await prisma.course.findUnique({ where: { id: metadata.courseId }, select: { title: true } })
    await sendPurchaseConfirmation({
      userId: metadata.userId,
      courseName: course?.title || "your course",
      courseUrl: `${appUrl}/courses/${metadata.courseSlug}/learn`,
      amountCents,
      idempotencyKey: `purchase-confirmation-${paymentIntentId}`,
      notificationType: "COURSE_ENROLLED",
      note: grantedStrategyAccess
        ? "This purchase also unlocks full access to the Strategy Library — browse every certified strategy's code and resources, no extra charge."
        : undefined,
    })
  }
}

/**
 * Takes back what a payment granted, on a full refund or a dispute: the
 * enrollments it created (by payment id, plus a cohort's included courses
 * recorded on its fulfillment) unless another live purchase also covers that
 * course, the bundle deposit, and course-purchase strategy access once no
 * paid course is left. Membership is recomputed.
 *
 * A purchase from before CheckoutFulfillment existed has no row: its type is
 * read back from the Stripe session, enough to clear a bundle deposit; a
 * pre-deploy cohort's included courses can't be told apart and are logged
 * for an admin. A charge with a customer is a strategy-unlock subscription's
 * (only subscription checkouts create customers; payment-mode ones are guest
 * checkouts), first payment or renewal, and that customer's grants end —
 * whether or not the charge also matched a purchase above.
 */
export async function revokePayment(
  paymentIntentId: string,
  customerId?: string | null,
): Promise<{ removedEnrollments: number }> {
  const fulfillments = await prisma.checkoutFulfillment.findMany({
    where: { paymentIntentId },
    select: { id: true, userId: true, type: true, enrollmentIds: true },
  })
  const byPayment = await prisma.enrollment.findMany({
    where: { stripePaymentId: paymentIntentId },
    select: { id: true, userId: true },
  })

  const userIds = new Set([...byPayment.map((e) => e.userId), ...fulfillments.map((f) => f.userId)])
  let legacyType: string | null = null
  if (fulfillments.length === 0) {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 })
    const legacy = sessions.data[0] ? readCheckoutMetadata(sessions.data[0]) : null
    if (legacy) {
      legacyType = legacy.type
      userIds.add(legacy.userId)
      if (legacy.type === "cohort") {
        console.warn(
          `Refund of ${paymentIntentId}: a cohort bought before checkout fulfillments were recorded — its included courses for user ${legacy.userId} need removing by hand`,
        )
      }
    }
  }

  // Keep a course another live purchase of the same user also covers
  const toDelete = await prisma.enrollment.findMany({
    where: { id: { in: [...new Set([...byPayment.map((e) => e.id), ...fulfillments.flatMap((f) => f.enrollmentIds)])] } },
    select: { id: true, userId: true, courseId: true },
  })
  const stillCovered = await prisma.checkoutFulfillment.findMany({
    where: { userId: { in: [...userIds] }, revokedAt: null, NOT: { paymentIntentId } },
    select: { userId: true, courseIds: true },
  })
  const covered = new Set(stillCovered.flatMap((f) => f.courseIds.map((c) => `${f.userId}:${c}`)))
  const removable = toDelete.filter((e) => !e.courseId || !covered.has(`${e.userId}:${e.courseId}`))
  const { count } = await prisma.enrollment.deleteMany({ where: { id: { in: removable.map((e) => e.id) } } })

  // Recorded even when nothing was fulfilled yet, so a late success redirect
  // or webhook retry doesn't grant it afterwards (see fulfillCheckout).
  if (fulfillments.length > 0) {
    await prisma.checkoutFulfillment.updateMany({ where: { paymentIntentId }, data: { revokedAt: new Date() } })
  } else {
    await prisma.checkoutFulfillment.create({
      data: {
        checkoutSessionId: `revoked:${paymentIntentId}`,
        paymentIntentId,
        userId: [...userIds][0] ?? "",
        type: "revoked",
        revokedAt: new Date(),
      },
    }).catch((error) => {
      if (!isUniqueViolation(error)) throw error
    })
  }

  if (customerId) {
    await prisma.strategyAccessGrant.updateMany({
      where: { stripeCustomerId: customerId, stripeSubscriptionId: { not: null }, status: { not: "canceled" } },
      data: { status: "canceled", cancelAtPeriodEnd: false },
    })
  }

  for (const userId of userIds) {
    const wasBundle =
      legacyType === "course-bundle" || fulfillments.some((f) => f.userId === userId && f.type === "course-bundle")
    if (wasBundle) {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { bundleDepositAt: null, bundleDepositCohortNumber: null },
      })
    }
    const paidCourseLeft = await prisma.enrollment.count({
      where: { userId, courseId: { not: null }, pricePaid: { gt: 0 } },
    })
    if (paidCourseLeft === 0) {
      await prisma.strategyAccessGrant.deleteMany({ where: { userId, status: "course-purchase" } })
    }
    await updateUserMembershipStatus(userId)
  }

  return { removedEnrollments: count }
}
