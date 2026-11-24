/**
 * A sponsor team acting on an application it was ranked for. The risks: a team
 * setting the status itself — back to DRAFT drops the entry out of the race,
 * including one another team already selected — and one team reading or
 * overwriting another's internal note.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

const applicationFindUnique = vi.fn()
const applicationUpdate = vi.fn()
const executeRaw = vi.fn()
// Notes keyed "applicationId:teamId", standing in for application_team_notes.
const notes = new Map<string, string>()
type NoteKey = { applicationId_teamId: { applicationId: string; teamId: string } }
const key = ({ applicationId_teamId: k }: NoteKey) => `${k.applicationId}:${k.teamId}`

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    team: { findUnique: async () => ({ id: "team_b", name: "Team B" }) },
    teamMember: { findUnique: async () => ({ teamId: "team_b", userId: "member" }) },
    application: {
      findUnique: (...a: unknown[]) => applicationFindUnique(...a),
      update: (...a: unknown[]) => applicationUpdate(...a),
      count: async () => 0,
    },
    $executeRaw: (...a: unknown[]) => executeRaw(...a),
    $transaction: async (fn: (tx: unknown) => unknown) => fn((await import("@/botcamp/lib/prisma")).prisma),
    applicationTeamNote: {
      findUnique: async ({ where }: { where: NoteKey }) => {
        const note = notes.get(key(where))
        return note === undefined ? null : { note }
      },
      upsert: async ({ where, create }: { where: NoteKey; create: { note: string } }) => {
        notes.set(key(where), create.note)
      },
      deleteMany: async ({ where }: { where: { applicationId: string; teamId: string } }) => {
        notes.delete(`${where.applicationId}:${where.teamId}`)
      },
    },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "member", role: "STUDENT" } }) }))
vi.mock("@/botcamp/lib/notifications", () => ({
  sendApplicationStatusEmail: vi.fn(async () => undefined),
  sendTeamOutrankedEmail: vi.fn(async () => undefined),
}))

const { GET, PUT } = await import("./route")

const put = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/teams/team-b/applications/app_1", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ teamSlug: "team-b", id: "app_1" }) },
  )

const selectedByTeamA = {
  id: "app_1",
  status: "REVIEWED",
  selectedTeamId: "team_a",
  teamPreferences: ["team_a", "team_b"],
  hackathon: { id: "h1", status: "COMPLETED", maxSelections: 5 },
}
const openHackathon = { id: "h1", status: "REGISTRATION", maxSelections: 5 }

beforeEach(() => {
  vi.clearAllMocks()
  notes.clear()
  notes.set("app_1:team_a", "Team A's private take")
  applicationFindUnique.mockResolvedValue(selectedByTeamA)
  applicationUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    ...selectedByTeamA,
    ...data,
  }))
})

describe("PUT /api/teams/[teamSlug]/applications/[id]", () => {
  it("ignores a status sent by the team", async () => {
    const res = await put({ status: "DRAFT" })

    expect(res.status).toBe(200)
    const data = applicationUpdate.mock.calls[0][0].data
    expect(data).not.toHaveProperty("status")
    expect((await res.json()).data.status).toBe("REVIEWED")
  })

  it("keeps each team's note to itself", async () => {
    const res = await put({ teamNote: "  Strong risk controls  " })

    expect(applicationUpdate.mock.calls[0][0].data).toEqual({})
    expect(notes.get("app_1:team_b")).toBe("Strong risk controls")
    expect(notes.get("app_1:team_a")).toBe("Team A's private take")
    expect((await res.json()).data.teamNote).toBe("Strong risk controls")
  })

  it("clears only this team's note", async () => {
    notes.set("app_1:team_b", "old")
    await put({ teamNote: "" })

    expect(notes.has("app_1:team_b")).toBe(false)
    expect(notes.get("app_1:team_a")).toBe("Team A's private take")
  })

  it("never returns the legacy shared note column", async () => {
    await put({ teamNote: "x" })

    expect(applicationUpdate.mock.calls[0][0].omit).toEqual({ teamNote: true })
  })

  it("rejects a note that isn't a string", async () => {
    expect((await put({ teamNote: { $set: "x" } })).status).toBe(400)
  })
})

describe("PUT select", () => {
  // Security review 2026-11 (L1): selecting a draft locked the builder out of editing it.
  it("won't select a draft", async () => {
    applicationFindUnique.mockResolvedValue({ ...selectedByTeamA, status: "DRAFT", selectedTeamId: null, hackathon: openHackathon })
    expect((await put({ select: true })).status).toBe(404)
    expect(applicationUpdate).not.toHaveBeenCalled()
  })

  it("re-checks for a draft inside the lock", async () => {
    applicationFindUnique
      .mockResolvedValueOnce({ ...selectedByTeamA, status: "FINALIZED", selectedTeamId: null, hackathon: openHackathon })
      .mockResolvedValueOnce({ selectedTeamId: null, teamPreferences: ["team_a", "team_b"], hackathonId: "h1", status: "DRAFT" })
    expect((await put({ select: true })).status).toBe(400)
    expect(applicationUpdate).not.toHaveBeenCalled()
  })

  // L2: two teams selecting at once could both see an empty seat.
  it("locks on the team and then on the application", async () => {
    applicationFindUnique
      .mockResolvedValueOnce({ ...selectedByTeamA, status: "FINALIZED", selectedTeamId: null, hackathon: openHackathon })
      .mockResolvedValueOnce({ selectedTeamId: null, teamPreferences: ["team_a", "team_b"], hackathonId: "h1", status: "FINALIZED" })
    await put({ select: true })
    const locks = executeRaw.mock.calls.map((c) => (c[0] as TemplateStringsArray).join("?"))
    expect(locks).toHaveLength(2)
    expect(locks[0]).toContain("team-select")
    expect(locks[1]).toContain("application-select")
  })
})

describe("GET /api/teams/[teamSlug]/applications/[id]", () => {
  const get = () =>
    GET(new NextRequest("http://localhost/api/teams/team-b/applications/app_1"), {
      params: Promise.resolve({ teamSlug: "team-b", id: "app_1" }),
    })

  // Security review 2026-11: the review page inlined a draft's full code.
  it("hides a ranked application while it's still a draft", async () => {
    applicationFindUnique.mockResolvedValue({ ...selectedByTeamA, status: "DRAFT", selectedTeamId: null })
    expect((await get()).status).toBe(404)
  })

  it("shows it once submitted", async () => {
    applicationFindUnique.mockResolvedValue({ ...selectedByTeamA, status: "FINALIZED", selectedTeamId: null })
    expect((await get()).status).toBe(200)
  })
})
