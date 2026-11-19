/**
 * What the author reads when their one review slot is taken. The risk: an
 * update to a live agent reading as if the whole agent were in review (and
 * gone from Condor), when Condor still serves the approved version.
 */

import { describe, it, expect, vi } from "vitest"

vi.mock("@/botcamp/lib/prisma", () => ({ prisma: {} }))

const { reviewSlotMessage } = await import("./agent-upload")

describe("reviewSlotMessage", () => {
  it("names the version when it's an update to a live agent", () => {
    expect(reviewSlotMessage({ title: "Grid Bot", status: "PENDING", version: 2, live: true })).toBe(
      'Version 2 of "Grid Bot" is in review — you can create another agent once it\'s decided',
    )
  })

  it("talks about the agent when it isn't live yet", () => {
    expect(reviewSlotMessage({ title: "Grid Bot", status: "NEEDS_REVIEW", version: 1, live: false })).toMatch(
      /^Your agent "Grid Bot" is in review/,
    )
  })

  it("asks to fix or delete a rejected agent", () => {
    expect(reviewSlotMessage({ title: "Grid Bot", status: "REJECTED", version: 1, live: false })).toMatch(
      /wasn't approved — fix it or delete it/,
    )
  })
})
