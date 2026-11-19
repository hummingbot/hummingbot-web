import { beforeEach, describe, expect, it, vi } from "vitest"

// The admin layout decides access from the role in the database, not the
// session token: someone demoted since signing in is out at once.
const auth = vi.fn()
const findUnique = vi.fn()
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`)
})
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => findUnique(...a) }, teamMember: { findFirst: async () => null } },
}))
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }))
vi.mock("@/components/layout/site-header", () => ({ SiteHeader: () => null, headerAccount: () => ({}) }))
vi.mock("@/botcamp/components/layout/DashboardShell", () => ({ DashboardShell: () => null }))

const { default: AdminLayout } = await import("./layout")

beforeEach(() => {
  auth.mockReset()
  findUnique.mockReset()
  redirect.mockClear()
})

describe("admin layout", () => {
  it("sends signed-out visitors to sign in", async () => {
    auth.mockResolvedValue(null)
    await expect(AdminLayout({ children: null })).rejects.toThrow("REDIRECT /signin?callbackUrl=%2Fadmin")
  })

  it("sends a student back to the dashboard, even with an ADMIN claim in the token", async () => {
    auth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } })
    findUnique.mockResolvedValue({ role: "STUDENT" })
    await expect(AdminLayout({ children: null })).rejects.toThrow("REDIRECT /dashboard")
  })

  it("lets admins and instructors in", async () => {
    for (const role of ["ADMIN", "INSTRUCTOR"]) {
      auth.mockResolvedValue({ user: { id: "u1", role } })
      findUnique.mockResolvedValue({ role })
      await expect(AdminLayout({ children: null })).resolves.toBeTruthy()
    }
    expect(redirect).not.toHaveBeenCalled()
  })
})
