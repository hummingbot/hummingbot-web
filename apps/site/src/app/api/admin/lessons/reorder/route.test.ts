/**
 * Reordering a section's lessons. The risk: the rights were checked on the
 * section, but every id in the list was updated, wherever it lived (security
 * review 2026-11).
 */

import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

const updateMany = vi.fn((args: unknown) => args)

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    section: { findUnique: async () => ({ courseId: "own_course" }) },
    course: { findUnique: async () => ({ instructorId: "inst" }) },
    lesson: { updateMany: (a: unknown) => updateMany(a) },
    $transaction: async (ops: unknown[]) => ops,
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "inst", role: "INSTRUCTOR" } }) }))

const { POST } = await import("./route")

describe("POST /api/admin/lessons/reorder", () => {
  it("only reorders lessons of the section it checked", async () => {
    await POST(
      new NextRequest("http://localhost/api/admin/lessons/reorder", {
        method: "POST",
        body: JSON.stringify({ sectionId: "own_section", lessonIds: ["mine", "someone_elses"] }),
        headers: { "content-type": "application/json" },
      }),
    )
    expect(updateMany.mock.calls.map((c) => c[0])).toEqual([
      { where: { id: "mine", sectionId: "own_section" }, data: { sortOrder: 0 } },
      { where: { id: "someone_elses", sectionId: "own_section" }, data: { sortOrder: 1 } },
    ])
  })
})
