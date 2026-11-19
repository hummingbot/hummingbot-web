/**
 * The post-checkout redirect. The risk: reopening an old success URL
 * re-enrolled someone whose access an admin or a refund had removed
 * (security review 2026-11).
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const retrieve = vi.fn()
const fulfillCheckout = vi.fn(async () => ({ outcome: "fulfilled" }))

vi.mock("@/botcamp/lib/stripe", () => ({ stripe: { checkout: { sessions: { retrieve: (...a: unknown[]) => retrieve(...a) } } } }))
vi.mock("@/botcamp/lib/checkout-fulfillment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/botcamp/lib/checkout-fulfillment")>()),
  fulfillCheckout: (...a: unknown[]) => fulfillCheckout(...(a as [])),
}))
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: {} }))

const { GET } = await import("./route")

const visit = () => GET(new NextRequest("http://localhost/api/checkout/success?session_id=cs_1"))
const now = () => Math.floor(Date.now() / 1000)
const session = (overrides: Record<string, unknown> = {}) => ({
  id: "cs_1",
  payment_status: "paid",
  created: now(),
  metadata: { type: "cohort", userId: "u1", cohortId: "c15", cohortNumber: "15" },
  payment_intent: { id: "pi_1", latest_charge: { refunded: false, disputed: false } },
  ...overrides,
})

beforeEach(() => vi.clearAllMocks())

describe("GET /api/checkout/success", () => {
  it("fulfills a fresh session and sends the buyer to it", async () => {
    retrieve.mockResolvedValue(session())
    const res = await visit()
    expect(fulfillCheckout).toHaveBeenCalled()
    expect(res.headers.get("location")).toContain("/cohorts/cohort15/learn")
  })

  it("never fulfills a refunded or disputed payment", async () => {
    retrieve.mockResolvedValue(session({ payment_intent: { id: "pi_1", latest_charge: { refunded: true, disputed: false } } }))
    const res = await visit()
    expect(fulfillCheckout).not.toHaveBeenCalled()
    expect(res.headers.get("location")).toContain("error=payment_refunded")
  })

  it("only redirects for a session older than a day — the webhook fulfilled it long ago", async () => {
    retrieve.mockResolvedValue(session({ created: now() - 2 * 24 * 60 * 60 }))
    const res = await visit()
    expect(fulfillCheckout).not.toHaveBeenCalled()
    expect(res.headers.get("location")).toContain("/cohorts/cohort15/learn")
  })
})
