/**
 * An instructor editing a lesson. The risk: the edit rights were checked on
 * the lesson's current course only, so an instructor could move their lesson
 * into another instructor's course or into a paid cohort week (security
 * review 2026-11).
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const lesson = { id: "l1", slug: "l1", title: "L1", type: "ARTICLE", sectionId: "own_section", cohortWeekId: null, quizData: null }
const sections: Record<string, string> = { own_section: "own_course", own_other_section: "own_course", their_section: "their_course" }
const instructors: Record<string, string> = { own_course: "inst", their_course: "someone_else" }
const lessonUpdate = vi.fn(async () => lesson)

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    lesson: {
      findUnique: vi.fn(async ({ select }: { select?: { section?: unknown } }) =>
        select?.section ? { ...lesson, section: { courseId: "own_course" } } : lesson,
      ),
      update: (...a: unknown[]) => lessonUpdate(...(a as [])),
    },
    section: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (sections[where.id] ? { courseId: sections[where.id] } : null)) },
    course: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ instructorId: instructors[where.id] })) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "inst", role: "INSTRUCTOR" } }) }))

const { PUT } = await import("./route")

const put = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/admin/lessons/l1", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "l1" }) },
  )

beforeEach(() => vi.clearAllMocks())

describe("PUT /api/admin/lessons/[id] as an instructor", () => {
  it("edits their own lesson", async () => {
    expect((await put({ title: "New" })).status).toBe(200)
  })

  it("moves it within their own course", async () => {
    expect((await put({ sectionId: "own_other_section" })).status).toBe(200)
  })

  it("can't move it into another instructor's course", async () => {
    expect((await put({ sectionId: "their_section" })).status).toBe(401)
    expect(lessonUpdate).not.toHaveBeenCalled()
  })

  it("can't move it into a cohort week", async () => {
    expect((await put({ cohortWeekId: "paid_week" })).status).toBe(401)
    expect(lessonUpdate).not.toHaveBeenCalled()
  })
})
