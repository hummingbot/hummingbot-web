import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The dashboard preview shows a real user's data without a login, so it must
// stay off in production and without DASHBOARD_PREVIEW_USER.
vi.mock("server-only", () => ({}))
const findFirst = vi.fn()
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: { user: { findFirst } } }))

const USER = {
  id: "u1",
  email: "builder@example.com",
  name: null,
  firstName: "Ada",
  lastName: "L",
  avatarUrl: null,
  role: "STUDENT",
  isMember: true,
}

async function load() {
  vi.resetModules()
  return import("./preview-session")
}

describe("dashboard preview session", () => {
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(USER)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("is off without DASHBOARD_PREVIEW_USER", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DASHBOARD_PREVIEW_USER", "")
    const { auth, isDashboardPreviewEnabled } = await load()
    expect(isDashboardPreviewEnabled()).toBe(false)
    expect(await auth()).toBeNull()
    expect(findFirst).not.toHaveBeenCalled()
  })

  it("is off in production even with the variable set", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DASHBOARD_PREVIEW_USER", USER.email)
    const { auth, isDashboardPreviewEnabled } = await load()
    expect(isDashboardPreviewEnabled()).toBe(false)
    expect(await auth()).toBeNull()
    expect(findFirst).not.toHaveBeenCalled()
  })

  it("is off for an email that isn't a user", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DASHBOARD_PREVIEW_USER", "nobody@example.com")
    findFirst.mockResolvedValue(null)
    const { auth } = await load()
    expect(await auth()).toBeNull()
  })

  it("returns the configured user as a session in development", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DASHBOARD_PREVIEW_USER", USER.email)
    const { auth } = await load()
    expect(await auth()).toEqual({
      user: { id: "u1", email: USER.email, name: "Ada L", image: null, role: "STUDENT", isMember: true },
    })
  })
})
