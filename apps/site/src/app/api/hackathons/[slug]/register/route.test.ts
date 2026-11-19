/**
 * Submission deadline gate (issue #80): once `Hackathon.registrationEnd`
 * passes, builders must no longer be able to register (create a
 * HackathonEntry), even though `status` is still REGISTRATION.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const hackathonFindUnique = vi.fn()
const hackathonEntryFindUnique = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    hackathon: { findUnique: (...args: unknown[]) => hackathonFindUnique(...args) },
    hackathonEntry: { findUnique: (...args: unknown[]) => hackathonEntryFindUnique(...args) },
  },
}))

vi.mock("@/botcamp/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}))

const { POST } = await import("./route")

const HOUR_MS = 60 * 60 * 1000

const baseHackathon = {
  id: "hackathon-1",
  title: "Agent Builders Cup",
  status: "REGISTRATION" as const,
  teamIds: ["team-1"],
}

// agreedToTerms deliberately omitted: reaching the terms check (a distinct
// 400) proves the deadline gate above it let the request through.
const postRequest = () =>
  new NextRequest("http://localhost/api/hackathons/agent-builders-cup-1/register", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
  })

const params = Promise.resolve({ slug: "agent-builders-cup-1" })

beforeEach(() => {
  hackathonFindUnique.mockReset()
  hackathonEntryFindUnique.mockReset()
})

describe("POST /api/hackathons/[slug]/register — submission deadline", () => {
  it("rejects new registrations once registrationEnd has passed", async () => {
    hackathonFindUnique.mockResolvedValue({
      ...baseHackathon,
      registrationEnd: new Date(Date.now() - HOUR_MS),
    })

    const response = await POST(postRequest(), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/registration is closed/i)
    expect(hackathonEntryFindUnique).not.toHaveBeenCalled()
  })

  it("does not apply the deadline gate before registrationEnd", async () => {
    hackathonFindUnique.mockResolvedValue({
      ...baseHackathon,
      registrationEnd: new Date(Date.now() + HOUR_MS),
    })

    const response = await POST(postRequest(), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/agree to the terms/i)
  })

  it("does not apply the deadline gate when registrationEnd is unset", async () => {
    hackathonFindUnique.mockResolvedValue({ ...baseHackathon, registrationEnd: null })

    const response = await POST(postRequest(), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/agree to the terms/i)
  })
})
