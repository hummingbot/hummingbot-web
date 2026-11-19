/**
 * Submission deadline gate (issue #80): once `Hackathon.registrationEnd`
 * passes, builders must no longer be able to create or finalize an
 * Application, even though `status` is still REGISTRATION.
 *
 * Notes (security review 2026-11): a builder's own applications came back
 * with every column, including the legacy shared team note and Botcamp's
 * adminNote to the sponsor teams.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const hackathonFindUnique = vi.fn()
const hackathonEntryFindUnique = vi.fn()
const applicationFindMany = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    hackathon: { findUnique: (...args: unknown[]) => hackathonFindUnique(...args) },
    hackathonEntry: { findUnique: (...args: unknown[]) => hackathonEntryFindUnique(...args) },
    application: { findMany: (...args: unknown[]) => applicationFindMany(...args) },
  },
}))

vi.mock("@/botcamp/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}))

vi.mock("@/botcamp/lib/notifications", () => ({
  sendApplicationSubmittedEmail: vi.fn().mockResolvedValue(undefined),
}))

const { GET, POST } = await import("./route")

const HOUR_MS = 60 * 60 * 1000

const baseHackathon = {
  id: "hackathon-1",
  status: "REGISTRATION" as const,
  teamIds: ["team-1"],
  startDate: new Date(Date.now() - 30 * 24 * HOUR_MS), // long since started
}

const postRequest = () =>
  new NextRequest("http://localhost/api/hackathons/agent-builders-cup-1/applications", {
    method: "POST",
    body: JSON.stringify({ strategyId: 1, teamPreferences: ["team-1"] }),
    headers: { "content-type": "application/json" },
  })

const params = Promise.resolve({ slug: "agent-builders-cup-1" })

beforeEach(() => {
  hackathonFindUnique.mockReset()
  hackathonEntryFindUnique.mockReset()
})

describe("POST /api/hackathons/[slug]/applications — submission deadline", () => {
  it("rejects a new application once registrationEnd has passed", async () => {
    hackathonFindUnique.mockResolvedValue({
      ...baseHackathon,
      registrationEnd: new Date(Date.now() - HOUR_MS), // deadline was an hour ago
    })

    const response = await POST(postRequest(), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/deadline has passed/i)
    // Must never reach entry/application lookups once the deadline gate fires.
    expect(hackathonEntryFindUnique).not.toHaveBeenCalled()
  })

  it("does not apply the deadline gate before registrationEnd", async () => {
    hackathonFindUnique.mockResolvedValue({
      ...baseHackathon,
      registrationEnd: new Date(Date.now() + HOUR_MS), // deadline is an hour away
    })
    // Not registered — proves control reached past the deadline check to the
    // next gate, rather than being rejected for the deadline reason.
    hackathonEntryFindUnique.mockResolvedValue(null)

    const response = await POST(postRequest(), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/must register for this hackathon/i)
  })

  it("does not apply the deadline gate when registrationEnd is unset", async () => {
    hackathonFindUnique.mockResolvedValue({ ...baseHackathon, registrationEnd: null })
    hackathonEntryFindUnique.mockResolvedValue(null)

    const response = await POST(postRequest(), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/must register for this hackathon/i)
  })
})

describe("GET /api/hackathons/[slug]/applications", () => {
  it("never returns the notes written for the sponsor teams", async () => {
    hackathonFindUnique.mockResolvedValue(baseHackathon)
    applicationFindMany.mockResolvedValue([])
    await GET(new NextRequest("http://localhost/api/hackathons/agent-builders-cup-1/applications"), { params })
    expect(applicationFindMany.mock.calls[0][0].omit).toEqual({ teamNote: true, adminNote: true })
  })
})
