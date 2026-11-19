/**
 * Strategy create gate. The risk: the open agent registry letting anyone
 * create strategies that show up on /strategies before review. Only an Agent
 * is open to non-members, and it's flagged agentApprovalRequired.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const userFindUnique = vi.fn()
const createStrategy = vi.fn()
const hasHackathonEntry = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
  },
}))
// The caps and quota are createStrategy's (src/lib/strategy-create.test.ts).
vi.mock("@/botcamp/lib/strategy-create", () => ({ createStrategy: (...args: unknown[]) => createStrategy(...args) }))
vi.mock("@/botcamp/lib/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { id: "u1", role: "STUDENT" } }) }))
vi.mock("@/botcamp/lib/hackathon-data", () => ({ hasHackathonEntry: () => hasHackathonEntry() }))
vi.mock("@/botcamp/lib/notifications", () => ({ sendStrategyCreatedEmail: vi.fn().mockResolvedValue(undefined) }))

const { POST } = await import("./route")

const create = (body: Record<string, unknown>) =>
  POST(
    new NextRequest("http://localhost/api/user/strategies", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  )

beforeEach(() => {
  vi.clearAllMocks()
  userFindUnique.mockResolvedValue({ role: "STUDENT", isMember: false })
  hasHackathonEntry.mockResolvedValue(false)
  createStrategy.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ strategy: { id: 1, ...data } }))
})

describe("POST /api/user/strategies", () => {
  it("lets anyone signed in create an Agent, flagged for approval", async () => {
    const res = await create({ title: "Grid Bot", strategyType: "AGENT" })
    expect(res.status).toBe(201)
    expect(createStrategy.mock.calls[0][0].data).toMatchObject({ strategyType: "AGENT", agentApprovalRequired: true })
  })

  it("still refuses other strategy types to non-members", async () => {
    const res = await create({ title: "Grid Bot", strategyType: "SCRIPT" })
    expect(res.status).toBe(403)
    expect(createStrategy).not.toHaveBeenCalled()
  })

  it("doesn't flag members or hackathon entrants", async () => {
    userFindUnique.mockResolvedValue({ role: "STUDENT", isMember: true })
    await create({ title: "Grid Bot", strategyType: "AGENT" })
    hasHackathonEntry.mockResolvedValue(true)
    userFindUnique.mockResolvedValue({ role: "STUDENT", isMember: false })
    await create({ title: "Grid Bot", strategyType: "AGENT" })
    expect(createStrategy.mock.calls.map((c) => c[0].data.agentApprovalRequired)).toEqual([false, false])
  })

  it("answers a cap or quota refusal with its status and Retry-After", async () => {
    createStrategy.mockResolvedValue({
      refusal: { error: "Too many strategies created recently", status: 429, retryAfterSeconds: 120 },
    })
    const res = await create({ title: "Grid Bot", strategyType: "AGENT" })
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("120")
    expect(await res.json()).toEqual({ error: "Too many strategies created recently" })
  })
})
