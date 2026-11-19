/**
 * A team's logo URL. The risk: any URL was saved, and GET .../logo redirects
 * to it — an open redirect on our domain (security review 2026-11).
 */

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const teamUpdate = vi.fn(async () => ({}))
const team = { id: "t1", slug: "orca", name: "Orca", logoUrl: null, logoUrlDark: null, logoData: null, logoMimeType: null, logoDataDark: null, logoMimeTypeDark: null }
const teamFindUnique = vi.fn(async () => team)

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    team: { findUnique: (...a: unknown[]) => teamFindUnique(...(a as [])), update: (...a: unknown[]) => teamUpdate(...(a as [])) },
    teamMember: { findUnique: async () => ({ teamId: "t1" }) },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: async () => ({ user: { id: "u1", role: "STUDENT" } }) }))

const { PATCH } = await import("./route")
const { GET: getLogo } = await import("./logo/route")

const patch = (body: unknown) =>
  PATCH(
    new NextRequest("http://localhost/api/teams/orca", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ teamSlug: "orca" }) },
  )

beforeEach(() => vi.clearAllMocks())

describe("PATCH /api/teams/[teamSlug] logo URLs", () => {
  it("takes a path on this site", async () => {
    expect((await patch({ logoUrl: "/logos/orca-logo.png" })).status).toBe(200)
  })

  it.each(["https://evil.example/logo.png", "//evil.example/logo.png", "javascript:alert(1)", "/\\evil.example"])(
    "refuses %s",
    async (logoUrl) => {
      expect((await patch({ logoUrl })).status).toBe(400)
      expect(teamUpdate).not.toHaveBeenCalled()
    },
  )
})

describe("GET /api/teams/[teamSlug]/logo", () => {
  const get = () => getLogo(new NextRequest("http://localhost/api/teams/orca/logo"), { params: Promise.resolve({ teamSlug: "orca" }) })

  it("never redirects off-site, even for a URL saved before the check", async () => {
    teamFindUnique.mockResolvedValueOnce({ ...team, logoUrl: "https://evil.example/logo.png" } as never)
    expect((await get()).status).toBe(404)
  })

  it("redirects to a same-site path (Botcamp's public/ files live under /botcamp-assets here)", async () => {
    teamFindUnique.mockResolvedValueOnce({ ...team, logoUrl: "/logos/orca-logo.png" } as never)
    expect((await get()).headers.get("location")).toBe("http://localhost/botcamp-assets/logos/orca-logo.png")
  })
})
