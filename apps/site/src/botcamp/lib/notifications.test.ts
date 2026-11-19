/**
 * Staff notifications. The risk: one event fanning out into an email per
 * ADMIN account — the 2026-10-29 probe's 47 strategies sent about three
 * emails each. Staff get one copy, at the shared inbox.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const sendEmail = vi.fn()
const notificationCreate = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    strategy: {
      findUnique: vi.fn(async () => ({
        title: "Grid Bot",
        authors: [{ user: { id: "u1", email: "author@example.com", firstName: "Ada", name: null, emailStrategyUpdates: true } }],
      })),
    },
    agentVersion: {
      findUnique: vi.fn(async () => ({
        version: 2,
        status: "NEEDS_REVIEW",
        strategy: { title: "Grid Bot" },
        uploadedBy: { firstName: "Ada", lastName: null, email: "author@example.com" },
      })),
    },
    notification: { create: (...args: unknown[]) => notificationCreate(...args) },
  },
}))
vi.mock("@/botcamp/lib/resend", async (importActual) => ({
  ...(await importActual<typeof import("./resend")>()),
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}))

const { STAFF_NOTIFICATIONS_EMAIL, sendAgentAwaitingAdminEmail, sendStrategyCreatedEmail } = await import("./notifications")

beforeEach(() => {
  vi.clearAllMocks()
  sendEmail.mockResolvedValue({ success: true })
})

describe("staff notifications", () => {
  it("a new strategy emails its author and the staff inbox, once each", async () => {
    await sendStrategyCreatedEmail(7)
    expect(sendEmail.mock.calls.map(([email]) => email.to).sort()).toEqual(["author@example.com", STAFF_NOTIFICATIONS_EMAIL].sort())
  })

  it("an agent awaiting its final check emails only the staff inbox", async () => {
    await sendAgentAwaitingAdminEmail("ver_1")
    expect(sendEmail.mock.calls.map(([email]) => email.to)).toEqual([STAFF_NOTIFICATIONS_EMAIL])
    // Logged without a recipient account: the inbox isn't a user.
    expect(notificationCreate.mock.calls[0][0].data).toMatchObject({ recipientId: null, status: "SENT" })
  })
})
