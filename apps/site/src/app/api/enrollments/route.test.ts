/**
 * Free enrollment. The risk: any signed-in user could enroll in a price-0
 * course before it was published (security review 2026-11).
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const courseFindUnique = vi.fn()
const enrollmentCreate = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    enrollment: { findUnique: vi.fn(async () => null), create: (...a: unknown[]) => enrollmentCreate(...a) },
    course: { findUnique: (...a: unknown[]) => courseFindUnique(...a) },
    user: { findUnique: vi.fn(async () => null) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "u1", role: "STUDENT" } }) }))
vi.mock("@/botcamp/lib/resend", () => ({ sendEmail: vi.fn(), emailTemplates: {} }))

const { POST } = await import("./route")

const enroll = () =>
  POST(
    new NextRequest("http://localhost/api/enrollments", {
      method: "POST",
      body: JSON.stringify({ courseId: "c1" }),
      headers: { "content-type": "application/json" },
    }),
  )

beforeEach(() => {
  vi.clearAllMocks()
  enrollmentCreate.mockResolvedValue({ id: "e1", course: { slug: "c", title: "C" } })
})

describe("POST /api/enrollments", () => {
  it("refuses a free course that isn't published", async () => {
    courseFindUnique.mockResolvedValue({ id: "c1", price: 0, published: false })
    expect((await enroll()).status).toBe(404)
    expect(enrollmentCreate).not.toHaveBeenCalled()
  })

  it("enrolls in a published free course", async () => {
    courseFindUnique.mockResolvedValue({ id: "c1", slug: "c", title: "C", price: 0, published: true })
    expect((await enroll()).status).toBe(201)
    expect(enrollmentCreate).toHaveBeenCalled()
  })
})
