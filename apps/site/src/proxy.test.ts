import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// The first gate for account pages. Access is still decided by the pages and
// the API (the admin layout reads the role from the database); this only
// keeps where a signed-out visit was headed, and holds instructors to the
// course tools, as Botcamp's middleware does.
const getToken = vi.fn()
vi.mock("next-auth/jwt", () => ({ getToken: (...args: unknown[]) => getToken(...args) }))

const { proxy } = await import("./proxy")

function visit(path: string, { session = false } = {}) {
  const req = new NextRequest(`http://localhost:3000${path}`)
  if (session) req.cookies.set("authjs.session-token", "encrypted")
  return proxy(req)
}

beforeEach(() => getToken.mockReset())

describe("proxy", () => {
  it("sends a signed-out visit to /signin, keeping the exact page", async () => {
    const res = await visit("/dashboard/strategies/12?tab=code")
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Fdashboard%2Fstrategies%2F12%3Ftab%3Dcode",
    )
    expect((await visit("/admin/users")).headers.get("location")).toContain("callbackUrl=%2Fadmin%2Fusers")
    expect((await visit("/connect")).headers.get("location")).toContain("callbackUrl=%2Fconnect")
  })

  it("lets a signed-in visit through to the dashboard", async () => {
    const res = await visit("/dashboard/team", { session: true })
    expect(res.headers.get("location")).toBeNull()
  })

  it("keeps instructors on the course tools", async () => {
    getToken.mockResolvedValue({ role: "INSTRUCTOR" })
    expect((await visit("/admin/users", { session: true })).headers.get("location")).toBe(
      "http://localhost:3000/admin/courses",
    )
    expect((await visit("/admin", { session: true })).headers.get("location")).toBe(
      "http://localhost:3000/admin/courses",
    )
    expect((await visit("/admin/courses/abc", { session: true })).headers.get("location")).toBeNull()
  })

  it("lets admins anywhere in /admin (the layout still checks the database)", async () => {
    getToken.mockResolvedValue({ role: "ADMIN" })
    expect((await visit("/admin/users", { session: true })).headers.get("location")).toBeNull()
  })

  it("treats a cookie that doesn't decrypt as signed out", async () => {
    getToken.mockResolvedValue(null)
    expect((await visit("/admin", { session: true })).headers.get("location")).toContain("/signin?callbackUrl=%2Fadmin")
  })
})
