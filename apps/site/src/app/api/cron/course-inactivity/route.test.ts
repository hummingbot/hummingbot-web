/**
 * Course-inactivity cron.
 *
 * The risk this guards against: one user enrolled in two courses has two
 * separate Enrollment rows. If lesson progress from one course ever counted
 * toward the other enrollment's completion/idle check, an active learner in
 * course B could get wrongly nudged for going quiet on course A (or vice
 * versa). Each test fixes one enrollment's course/lessons and asserts the
 * cron only ever looks at *that* enrollment's own lessons.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const enrollmentFindMany = vi.fn()
const lessonProgressFindMany = vi.fn()
const sendCourseInactivityReminder = vi.fn().mockResolvedValue({ success: true })

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    enrollment: { findMany: (...args: unknown[]) => enrollmentFindMany(...args) },
    lessonProgress: { findMany: (...args: unknown[]) => lessonProgressFindMany(...args) },
  },
}))

vi.mock("@/botcamp/lib/notifications", () => ({
  sendCourseInactivityReminder: (...args: unknown[]) => sendCourseInactivityReminder(...args),
}))

const { GET } = await import("./route")

const DAY_MS = 24 * 60 * 60 * 1000
const request = () =>
  new Request("http://localhost/api/cron/course-inactivity", {
    headers: { authorization: "Bearer test-secret" },
  }) as never

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret"
  enrollmentFindMany.mockReset()
  lessonProgressFindMany.mockReset()
  sendCourseInactivityReminder.mockClear()
})

describe("course-inactivity cron", () => {
  it("scopes each enrollment's idle check to that enrollment's own lessons, even for the same user", async () => {
    // One user, two enrollments: quiet on course A for 10 days (past the
    // WEEK threshold), but actively finishing lessons on course B today.
    enrollmentFindMany.mockResolvedValue([
      {
        id: "enr-course-a",
        userId: "user-1",
        course: { sections: [{ lessons: [{ id: "lesson-a1" }, { id: "lesson-a2" }] }] },
        inactivityReminders: [],
      },
      {
        id: "enr-course-b",
        userId: "user-1",
        course: { sections: [{ lessons: [{ id: "lesson-b1" }] }] },
        inactivityReminders: [],
      },
    ])

    const tenDaysAgo = new Date(Date.now() - 10 * DAY_MS)
    const today = new Date()

    lessonProgressFindMany.mockImplementation(({ where }: { where: { lessonId: { in: string[] } } }) => {
      const ids: string[] = where.lessonId.in
      // Course A: started, one lesson done a week+ ago, gone quiet since.
      if (ids.includes("lesson-a1")) {
        return Promise.resolve([
          { completedAt: tenDaysAgo, updatedAt: tenDaysAgo },
        ])
      }
      // Course B: actively progressing today — must never see course A's
      // stale ten-day-old timestamp instead.
      if (ids.includes("lesson-b1")) {
        return Promise.resolve([{ completedAt: null, updatedAt: today }])
      }
      throw new Error(`unexpected lessonId filter: ${ids.join(",")}`)
    })

    const res = await GET(request())
    const body = await res.json()

    expect(body).toMatchObject({ ok: true, matched: 1, weekSent: 1 })
    expect(sendCourseInactivityReminder).toHaveBeenCalledTimes(1)
    expect(sendCourseInactivityReminder).toHaveBeenCalledWith("enr-course-a", "WEEK")
    // Course B's enrollment must never be nudged off course A's inactivity.
    expect(sendCourseInactivityReminder).not.toHaveBeenCalledWith("enr-course-b", expect.anything())
  })

  it("passes the matching enrollment id + tier for each enrollment it nudges, not a shared/last-seen one", async () => {
    const monthAgo = new Date(Date.now() - 35 * DAY_MS)
    const weekAgo = new Date(Date.now() - 8 * DAY_MS)

    enrollmentFindMany.mockResolvedValue([
      {
        id: "enr-alice-intro",
        userId: "user-alice",
        course: { sections: [{ lessons: [{ id: "l1" }] }] },
        inactivityReminders: [],
      },
      {
        id: "enr-bob-market-making",
        userId: "user-bob",
        course: { sections: [{ lessons: [{ id: "l2" }] }] },
        inactivityReminders: [],
      },
    ])

    lessonProgressFindMany.mockImplementation(({ where }: { where: { lessonId: { in: string[] } } }) => {
      if (where.lessonId.in.includes("l1")) {
        return Promise.resolve([{ completedAt: null, updatedAt: monthAgo }])
      }
      return Promise.resolve([{ completedAt: null, updatedAt: weekAgo }])
    })

    await GET(request())

    expect(sendCourseInactivityReminder).toHaveBeenCalledWith("enr-alice-intro", "MONTH")
    expect(sendCourseInactivityReminder).toHaveBeenCalledWith("enr-bob-market-making", "WEEK")
  })

  it("rejects requests without the correct cron secret", async () => {
    const res = await GET(
      new Request("http://localhost/api/cron/course-inactivity", {
        headers: { authorization: "Bearer wrong" },
      }) as never,
    )
    expect(res.status).toBe(401)
    expect(enrollmentFindMany).not.toHaveBeenCalled()
  })
})
