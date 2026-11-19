/**
 * Admin decision on an agent version. The risks: a non-admin deciding, a
 * rejection the author can't act on (no note), and sending a version back
 * to the AI queue with its old decision still in place.
 */

import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { describe, it, expect, vi, beforeEach } from "vitest"

const versionFindUnique = vi.fn()
const versionUpdate = vi.fn()
const versionCount = vi.fn()
const strategyUpdateMany = vi.fn()
const auth = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    agentVersion: {
      findUnique: (...args: unknown[]) => versionFindUnique(...args),
      update: (...args: unknown[]) => versionUpdate(...args),
      count: (...args: unknown[]) => versionCount(...args),
    },
    strategy: { updateMany: (...args: unknown[]) => strategyUpdateMany(...args) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
const sendEmail = vi.fn()
vi.mock("@/botcamp/lib/notifications", () => ({ sendAgentVersionStatusEmail: (id: string) => sendEmail(id) }))

const { PATCH } = await import("./route")

const patch = (body: unknown) =>
  PATCH(
    new NextRequest("http://localhost/api/admin/agent-versions/v1", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "v1" }) },
  )

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } })
  versionFindUnique.mockResolvedValue({ id: "v1", strategyId: 7, status: "NEEDS_REVIEW" })
  versionCount.mockResolvedValue(0)
  versionUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "v1", ...data }))
  sendEmail.mockResolvedValue(undefined)
})

describe("PATCH /api/admin/agent-versions/[id]", () => {
  it("is admin-only", async () => {
    auth.mockResolvedValue({ user: { id: "u", role: "INSTRUCTOR" } })
    expect((await patch({ action: "approve" })).status).toBe(401)
    expect(versionUpdate).not.toHaveBeenCalled()
  })

  it("approves, recording who decided", async () => {
    expect((await patch({ action: "approve" })).status).toBe(200)
    expect(versionUpdate.mock.calls[0][0].data).toMatchObject({ status: "APPROVED", reviewedById: "admin", reviewNote: null })
    expect(sendEmail).toHaveBeenCalledWith("v1")
  })

  it("leaves the page alone on a later approval — the author may have hidden it", async () => {
    versionCount.mockResolvedValue(1)
    await patch({ action: "approve" })
    expect(versionCount.mock.calls[0][0].where).toEqual({ strategyId: 7, status: "APPROVED", id: { not: "v1" } })
    expect(strategyUpdateMany).not.toHaveBeenCalled()
  })

  it("publishes the agent's page on its first approval, if it was private", async () => {
    await patch({ action: "approve" })
    expect(strategyUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, visibility: "PRIVATE" },
      data: { visibility: "PUBLIC" },
    })
  })

  it("leaves the page alone on a rejection or a rerun", async () => {
    await patch({ action: "reject", note: "Posts env vars to a pastebin" })
    await patch({ action: "rerun" })
    expect(strategyUpdateMany).not.toHaveBeenCalled()
  })

  it("still answers when the email fails", async () => {
    sendEmail.mockRejectedValue(new Error("resend down"))
    expect((await patch({ action: "approve" })).status).toBe(200)
  })

  it("rejects only with a note for the author", async () => {
    expect((await patch({ action: "reject", note: "  " })).status).toBe(400)
    expect(versionUpdate).not.toHaveBeenCalled()
    await patch({ action: "reject", note: "Routine posts env vars to a pastebin" })
    expect(versionUpdate.mock.calls[0][0].data).toMatchObject({
      status: "REJECTED",
      reviewNote: "Routine posts env vars to a pastebin",
    })
  })

  it("sends a version back to the AI review queue with its old verdict cleared", async () => {
    await patch({ action: "rerun" })
    expect(versionUpdate.mock.calls[0][0].data).toEqual({
      status: "PENDING",
      aiReview: Prisma.DbNull,
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
    })
    expect(sendEmail).not.toHaveBeenCalled() // the next verdict emails when it lands
  })

  it("approves only what the AI review passed — a later version is reviewed like a new agent", async () => {
    for (const status of ["PENDING", "REJECTED", "APPROVED"]) {
      versionFindUnique.mockResolvedValue({ id: "v1", strategyId: 7, status })
      expect((await patch({ action: "approve" })).status).toBe(409)
    }
    expect(versionUpdate).not.toHaveBeenCalled()
    expect(strategyUpdateMany).not.toHaveBeenCalled()
  })

  it("decides only on the status it read, so a concurrent change isn't overwritten", async () => {
    await patch({ action: "approve" })
    expect(versionUpdate.mock.calls[0][0].where).toEqual({ id: "v1", status: "NEEDS_REVIEW" })

    versionUpdate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "6" }),
    )
    expect((await patch({ action: "approve" })).status).toBe(409)
  })

  it("still lets an admin reject a version the AI hasn't reviewed", async () => {
    versionFindUnique.mockResolvedValue({ id: "v1", strategyId: 7, status: "PENDING" })
    expect((await patch({ action: "reject", note: "Obvious key exfiltration" })).status).toBe(200)
  })

  it("rejects unknown actions and versions", async () => {
    expect((await patch({ action: "delete" })).status).toBe(400)
    versionFindUnique.mockResolvedValue(null)
    expect((await patch({ action: "approve" })).status).toBe(404)
  })
})
