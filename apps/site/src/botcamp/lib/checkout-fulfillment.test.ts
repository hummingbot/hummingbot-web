/**
 * Checkout fulfillment and refunds (security review 2026-11). The risks:
 * Stripe refunds and disputes never took access back, and reopening an old
 * /api/checkout/success URL enrolled someone again after an admin had removed
 * them, because "already done" meant "the enrollment still exists".
 */

import { Prisma } from "@prisma/client"
import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const db = {
  checkoutFulfillment: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  enrollment: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  course: { findMany: vi.fn(), findUnique: vi.fn() },
  cohort: { findUnique: vi.fn() },
  user: { update: vi.fn(), updateMany: vi.fn() },
  strategyAccessGrant: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
}

vi.mock("@/botcamp/lib/prisma", () => ({ prisma: db }))
const sessionsList = vi.fn<(args: unknown) => Promise<{ data: unknown[] }>>(async () => ({ data: [] }))
vi.mock("@/botcamp/lib/stripe", () => ({ stripe: { checkout: { sessions: { list: (a: unknown) => sessionsList(a) } } } }))
const sendPurchaseConfirmation = vi.fn()
vi.mock("@/botcamp/lib/notifications", () => ({ sendPurchaseConfirmation: (...a: unknown[]) => sendPurchaseConfirmation(...a) }))
const updateUserMembershipStatus = vi.fn()
vi.mock("@/botcamp/lib/enrollment-utils", () => ({ updateUserMembershipStatus: (...a: unknown[]) => updateUserMembershipStatus(...a) }))
const grantStrategyAccessFromCoursePurchase = vi.fn(async () => true)
vi.mock("@/botcamp/lib/strategy-access", () => ({
  STRATEGY_UNLOCK_DURATION_DAYS: 365,
  grantStrategyAccessFromCoursePurchase: (...a: unknown[]) => grantStrategyAccessFromCoursePurchase(...(a as [])),
}))

const { fulfillCheckout, revokePayment } = await import("./checkout-fulfillment")

const session = (metadata: Record<string, string>, overrides: Partial<Stripe.Checkout.Session> = {}) =>
  ({
    id: "cs_1",
    payment_status: "paid",
    payment_intent: "pi_1",
    amount_total: 380000,
    created: Math.floor(Date.now() / 1000),
    metadata,
    ...overrides,
  }) as Stripe.Checkout.Session

const cohortSession = () => session({ type: "cohort", userId: "u1", cohortId: "c15", cohortNumber: "15" })

beforeEach(() => {
  vi.clearAllMocks()
  db.checkoutFulfillment.findFirst.mockResolvedValue(null)
  db.checkoutFulfillment.create.mockResolvedValue({ id: "f1" })
  db.enrollment.findUnique.mockResolvedValue(null)
  let n = 0
  db.enrollment.create.mockImplementation(async () => ({ id: `e${++n}` }))
  db.course.findMany.mockResolvedValue([{ id: "course_a" }, { id: "course_b" }])
  db.enrollment.findMany.mockResolvedValue([])
  db.checkoutFulfillment.findMany.mockResolvedValue([])
  sessionsList.mockResolvedValue({ data: [] })
  db.enrollment.deleteMany.mockResolvedValue({ count: 0 })
  db.enrollment.count.mockResolvedValue(0)
})

describe("fulfillCheckout", () => {
  it("claims the session, enrolls, and records every enrollment it created", async () => {
    expect((await fulfillCheckout(cohortSession())).outcome).toBe("fulfilled")
    expect(db.checkoutFulfillment.create).toHaveBeenCalledWith({
      data: { checkoutSessionId: "cs_1", paymentIntentId: "pi_1", userId: "u1", type: "cohort" },
    })
    expect(db.checkoutFulfillment.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { enrollmentIds: ["e1", "e2", "e3"], courseIds: ["course_a", "course_b"] },
    })
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { isMember: true } })
    expect(sendPurchaseConfirmation).toHaveBeenCalledTimes(1)
    expect(db.checkoutFulfillment.update).toHaveBeenLastCalledWith({
      where: { id: "f1" },
      data: { completedAt: expect.any(Date) },
    })
  })

  const claimTaken = () =>
    db.checkoutFulfillment.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6", meta: { target: ["checkoutSessionId"] } }),
    )

  it("grants nothing a second time for the same session — even after access was removed", async () => {
    claimTaken()
    db.checkoutFulfillment.findUnique.mockResolvedValue({ id: "f1", completedAt: new Date(), revokedAt: null })
    expect((await fulfillCheckout(cohortSession())).outcome).toBe("already")
    expect(db.enrollment.create).not.toHaveBeenCalled()
    expect(sendPurchaseConfirmation).not.toHaveBeenCalled()
  })

  it("finishes the steps a crash cut short after the claim, on Stripe's retry", async () => {
    claimTaken()
    db.checkoutFulfillment.findUnique.mockResolvedValue({ id: "f1", completedAt: null, revokedAt: null })
    const paidCourse = session({ userId: "u1", courseId: "course_a", courseSlug: "a" }, { amount_total: 9900 })
    expect((await fulfillCheckout(paidCourse)).outcome).toBe("already")
    expect(grantStrategyAccessFromCoursePurchase).toHaveBeenCalledWith("u1")
    expect(sendPurchaseConfirmation).toHaveBeenCalledTimes(1)
    expect(db.checkoutFulfillment.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { completedAt: expect.any(Date) } })
  })

  it("doesn't finish a cut-short purchase that was refunded since", async () => {
    claimTaken()
    db.checkoutFulfillment.findUnique.mockResolvedValue({ id: "f1", completedAt: null, revokedAt: new Date() })
    await fulfillCheckout(cohortSession())
    expect(sendPurchaseConfirmation).not.toHaveBeenCalled()
  })

  it("refuses a payment that was refunded or disputed before it was fulfilled", async () => {
    db.checkoutFulfillment.findFirst.mockResolvedValue({ id: "revoked" })
    expect((await fulfillCheckout(cohortSession())).outcome).toBe("revoked")
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it("rethrows any other conflict, so Stripe retries the webhook", async () => {
    db.enrollment.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6", meta: { target: ["userId", "courseId"] } }),
    )
    await expect(fulfillCheckout(cohortSession())).rejects.toThrow()
  })

  it("fulfills a session a 100% promo code brought to $0", async () => {
    const free = session({ type: "cohort", userId: "u1", cohortId: "c15", cohortNumber: "15" }, {
      payment_status: "no_payment_required",
      payment_intent: null,
      amount_total: 0,
    })
    expect((await fulfillCheckout(free)).outcome).toBe("fulfilled")
  })

  it("refuses an unpaid session", async () => {
    expect((await fulfillCheckout(session({ type: "cohort", userId: "u1", cohortId: "c15" }, { payment_status: "unpaid" }))).outcome).toBe("unpaid")
  })

  it("grants course-purchase strategy access for a paid course, whichever entry point fulfills", async () => {
    await fulfillCheckout(session({ userId: "u1", courseId: "course_a", courseSlug: "a" }, { amount_total: 9900 }))
    expect(grantStrategyAccessFromCoursePurchase).toHaveBeenCalledWith("u1")
  })
})

describe("revokePayment", () => {
  it("removes the payment's enrollments, a cohort's included courses, and recomputes membership", async () => {
    db.checkoutFulfillment.findMany
      .mockResolvedValueOnce([{ id: "f1", userId: "u1", type: "cohort", enrollmentIds: ["e1", "e2", "e3"] }])
      .mockResolvedValueOnce([])
    db.enrollment.findMany
      .mockResolvedValueOnce([{ id: "e1", userId: "u1" }])
      .mockResolvedValueOnce([
        { id: "e1", userId: "u1", courseId: null },
        { id: "e2", userId: "u1", courseId: "course_a" },
        { id: "e3", userId: "u1", courseId: "course_b" },
      ])
    db.enrollment.deleteMany.mockResolvedValue({ count: 3 })

    expect(await revokePayment("pi_1")).toEqual({ removedEnrollments: 3 })
    expect(db.enrollment.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["e1", "e2", "e3"] } } })
    expect(db.checkoutFulfillment.updateMany).toHaveBeenCalledWith({
      where: { paymentIntentId: "pi_1" },
      data: { revokedAt: expect.any(Date) },
    })
    expect(updateUserMembershipStatus).toHaveBeenCalledWith("u1")
  })

  it("drops course-purchase strategy access once no paid course is left", async () => {
    db.enrollment.findMany.mockResolvedValue([{ id: "e9", userId: "u1" }])
    await revokePayment("pi_1")
    expect(db.strategyAccessGrant.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", status: "course-purchase" } })
  })

  it("records the refund even when nothing was fulfilled yet, so a late fulfillment is refused", async () => {
    db.checkoutFulfillment.create.mockResolvedValue({ id: "r1" })
    await revokePayment("pi_2")
    expect(db.checkoutFulfillment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ checkoutSessionId: "revoked:pi_2", paymentIntentId: "pi_2", revokedAt: expect.any(Date) }),
    })
  })

  it("keeps a course another live purchase of the user also covers", async () => {
    db.checkoutFulfillment.findMany
      .mockResolvedValueOnce([{ id: "f1", userId: "u1", type: "cohort", enrollmentIds: ["e1", "e2"] }])
      .mockResolvedValueOnce([{ userId: "u1", courseIds: ["course_b"] }])
    db.enrollment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "e1", userId: "u1", courseId: "course_a" },
        { id: "e2", userId: "u1", courseId: "course_b" },
      ])
    await revokePayment("pi_1")
    expect(db.enrollment.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["e1"] } } })
  })

  it("clears a pre-deploy bundle's deposit, reading its type back from Stripe", async () => {
    sessionsList.mockResolvedValue({ data: [{ metadata: { type: "course-bundle", userId: "u7" } }] })
    await revokePayment("pi_old")
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u7" },
      data: { bundleDepositAt: null, bundleDepositCohortNumber: null },
    })
  })

  it("ends a refunded subscription's grant when the charge matches no purchase", async () => {
    await revokePayment("pi_renewal", "cus_1")
    expect(db.strategyAccessGrant.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_1", stripeSubscriptionId: { not: null }, status: { not: "canceled" } },
      data: { status: "canceled", cancelAtPeriodEnd: false },
    })
  })

  it("ends a refunded subscription's grant even when its checkout session was found too", async () => {
    sessionsList.mockResolvedValue({ data: [{ metadata: { type: "strategy-unlock", userId: "u7" } }] })
    await revokePayment("pi_first", "cus_7")
    expect(db.strategyAccessGrant.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_7", stripeSubscriptionId: { not: null }, status: { not: "canceled" } },
      data: { status: "canceled", cancelAtPeriodEnd: false },
    })
  })
})
