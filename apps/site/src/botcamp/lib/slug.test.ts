/**
 * Strategy slugs. The risk: a taken name getting `-2`, which next to an
 * agent's versions reads as "version 2" — Condor addresses agents by slug.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

let taken: Set<string>
const userFindUnique = vi.fn()
const authorFindFirst = vi.fn()

vi.mock("./prisma", () => ({
  prisma: {
    strategy: {
      findFirst: async ({ where }: { where: { slug: string } }) => (taken.has(where.slug) ? { id: 1 } : null),
    },
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    strategyAuthor: { findFirst: (...args: unknown[]) => authorFindFirst(...args) },
  },
}))

const { generateUniqueSlug } = await import("./slug")

beforeEach(() => {
  taken = new Set()
  userFindUnique.mockReset().mockResolvedValue({ slug: "sofia" })
  authorFindFirst.mockReset().mockResolvedValue({ user: { slug: "raj" } })
})

describe("generateUniqueSlug for a strategy", () => {
  it("keeps the name when it's free", async () => {
    expect(await generateUniqueSlug("Grid Bot", "strategy", undefined, "u1")).toBe("grid-bot")
  })

  it("adds the author's username to a taken name, not a number", async () => {
    taken.add("grid-bot")
    expect(await generateUniqueSlug("Grid Bot", "strategy", undefined, "u1")).toBe("grid-bot-sofia")
  })

  it("adds letters, never digits, when the author's one is taken too", async () => {
    taken = new Set(["grid-bot", "grid-bot-sofia"])
    expect(await generateUniqueSlug("Grid Bot", "strategy", undefined, "u1")).toMatch(/^grid-bot-sofia-[a-z]{4}$/)
  })

  it("uses the strategy's first author on a rename", async () => {
    taken.add("grid-bot")
    expect(await generateUniqueSlug("Grid Bot", "strategy", 7)).toBe("grid-bot-raj")
    expect(authorFindFirst.mock.calls[0][0].where).toEqual({ strategyId: 7 })
  })
})
