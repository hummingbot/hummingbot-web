/**
 * Cohort checkout's multi-course discount. The risk: it counted every course
 * enrollment, free ones included, so enrolling in three free courses took
 * $600 off a cohort (security review 2026-11).
 */

import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

const enrollmentCount = vi.fn(async () => 0)
const sessionsCreate = vi.fn(async () => ({ url: "https://checkout.stripe.test" }))

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    user: { findUnique: async () => ({ email: "ada@example.com" }) },
    cohort: { findUnique: async () => ({ id: "c15", number: 15, title: "Cohort 15", price: 380000, status: "UPCOMING" }) },
    enrollment: { findFirst: async () => null, count: (...a: unknown[]) => enrollmentCount(...(a as [])) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "u1", email: "ada@example.com" } }) }))
vi.mock("@/botcamp/lib/stripe", () => ({ stripe: { checkout: { sessions: { create: (...a: unknown[]) => sessionsCreate(...(a as [])) } } } }))

const { POST } = await import("./route")

describe("POST /api/checkout — cohort multi-course discount", () => {
  it("counts only courses that were paid for", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.botcamp.xyz")
    enrollmentCount.mockResolvedValueOnce(3)
    await POST(
      new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        body: JSON.stringify({ cohortId: "c15" }),
        headers: { "content-type": "application/json" },
      }),
    )
    expect((enrollmentCount.mock.calls[0] as unknown[])[0]).toEqual({
      where: {
        userId: "u1",
        courseId: { not: null },
        OR: [{ pricePaid: { gt: 0 } }, { stripePaymentId: { not: null } }],
      },
    })
    const { line_items } = (sessionsCreate.mock.calls[0] as unknown[])[0] as {
      line_items: { price_data: { unit_amount: number } }[]
    }
    expect(line_items[0].price_data.unit_amount).toBe(380000 - 60000)
  })
})
