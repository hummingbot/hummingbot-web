/**
 * Creating a lesson as an instructor. The risk: a body with both the
 * instructor's own sectionId and a cohortWeekId passed the section check and
 * put the lesson in a paid cohort week (second review, 2026-11).
 */

import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

const lessonCreate = vi.fn(async () => ({ id: "l1" }))
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    section: { findUnique: async () => ({ courseId: "own_course" }) },
    course: { findUnique: async () => ({ instructorId: "inst" }) },
    lesson: { findUnique: async () => null, findFirst: async () => null, create: (...a: unknown[]) => lessonCreate(...(a as [])) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "inst", role: "INSTRUCTOR" } }) }))

const { POST } = await import("./route")

const create = (body: Record<string, unknown>) =>
  POST(
    new NextRequest("http://localhost/api/admin/lessons", {
      method: "POST",
      body: JSON.stringify({ title: "L", slug: "l", type: "ARTICLE", ...body }),
      headers: { "content-type": "application/json" },
    }),
  )

describe("POST /api/admin/lessons as an instructor", () => {
  it("refuses a lesson for both a section and a cohort week", async () => {
    expect((await create({ sectionId: "own_section", cohortWeekId: "paid_week" })).status).toBe(400)
    expect(lessonCreate).not.toHaveBeenCalled()
  })

  it("refuses a cohort week on its own", async () => {
    expect((await create({ cohortWeekId: "paid_week" })).status).toBe(401)
  })

  it("adds a lesson to their own section", async () => {
    expect((await create({ sectionId: "own_section" })).status).toBe(201)
  })
})
