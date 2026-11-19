/**
 * The Stripe webhook's refund and dispute handling (security review 2026-11):
 * a full refund or a dispute takes access back; a partial refund doesn't.
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

let event: unknown
const chargesRetrieve = vi.fn()
vi.mock("@/botcamp/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: () => event },
    charges: { retrieve: (...a: unknown[]) => chargesRetrieve(...a) },
  },
}))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "stripe-signature": "sig" }) }))
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: {} }))
const revokePayment = vi.fn(async () => ({ removedEnrollments: 1 }))
const fulfillCheckout = vi.fn(async () => ({ outcome: "fulfilled" }))
vi.mock("@/botcamp/lib/checkout-fulfillment", () => ({
  revokePayment: (...a: unknown[]) => revokePayment(...(a as [])),
  fulfillCheckout: (...a: unknown[]) => fulfillCheckout(...(a as [])),
}))

const { POST } = await import("./route")
const send = () => POST(new NextRequest("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test")
})

describe("POST /api/webhooks/stripe", () => {
  it("revokes a fully refunded payment, passing its customer along", async () => {
    event = { type: "charge.refunded", data: { object: { refunded: true, payment_intent: "pi_1", customer: "cus_1" } } }
    await send()
    expect(revokePayment).toHaveBeenCalledWith("pi_1", "cus_1")
  })

  it("leaves a partial refund alone", async () => {
    event = { type: "charge.refunded", data: { object: { refunded: false, payment_intent: "pi_1" } } }
    await send()
    expect(revokePayment).not.toHaveBeenCalled()
  })

  it("revokes a disputed payment, looking up the charge for its customer", async () => {
    chargesRetrieve.mockResolvedValue({ customer: "cus_2" })
    event = { type: "charge.dispute.created", data: { object: { payment_intent: "pi_2", charge: "ch_2" } } }
    await send()
    expect(chargesRetrieve).toHaveBeenCalledWith("ch_2")
    expect(revokePayment).toHaveBeenCalledWith("pi_2", "cus_2")
  })

  it("fulfills a completed checkout through the shared fulfillment", async () => {
    event = { type: "checkout.session.completed", data: { object: { id: "cs_1" } } }
    await send()
    expect(fulfillCheckout).toHaveBeenCalledWith({ id: "cs_1" })
  })
})
