import { describe, expect, it, vi } from "vitest"

const userFindUnique = vi.fn()
const accountFindUnique = vi.fn(async () => null)
vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    account: { findUnique: (...a: unknown[]) => accountFindUnique(...(a as [])) },
  },
}))

const { isSignedInAsSomeoneElse, isVerifiedOAuthEmail } = await import("./oauth-email")

const githubEmails = (emails: { email: string; verified: boolean; primary?: boolean }[], ok = true) =>
  vi.fn(async () => new Response(JSON.stringify(emails), { status: ok ? 200 : 401 })) as unknown as typeof fetch

const github = (email: string, fetchImpl: typeof fetch) =>
  isVerifiedOAuthEmail({ provider: "github", email, profile: {}, accessToken: "gho_x", fetchImpl })

describe("isVerifiedOAuthEmail", () => {
  it("accepts a GitHub email that GitHub has verified", async () => {
    const fetchImpl = githubEmails([{ email: "Victim@Example.com", verified: true, primary: true }])
    expect(await github("victim@example.com", fetchImpl)).toBe(true)
  })

  it("refuses an unverified GitHub primary email", async () => {
    const fetchImpl = githubEmails([
      { email: "victim@example.com", verified: false, primary: true },
      { email: "attacker@example.com", verified: true },
    ])
    expect(await github("victim@example.com", fetchImpl)).toBe(false)
  })

  it("refuses when GitHub won't list the emails", async () => {
    expect(await github("victim@example.com", githubEmails([], false))).toBe(false)
  })

  it("refuses GitHub without an access token", async () => {
    expect(
      await isVerifiedOAuthEmail({ provider: "github", email: "a@b.co", profile: {}, accessToken: undefined }),
    ).toBe(false)
  })

  it("trusts Google's email_verified claim only when it is true", async () => {
    const google = (profile: Record<string, unknown>) =>
      isVerifiedOAuthEmail({ provider: "google", email: "a@b.co", profile, accessToken: "x" })
    expect(await google({ email_verified: true })).toBe(true)
    expect(await google({ email_verified: false })).toBe(false)
    expect(await google({ email_verified: "true" })).toBe(false)
    expect(await google({})).toBe(false)
  })

  it("refuses a missing email or an unknown provider", async () => {
    expect(await isVerifiedOAuthEmail({ provider: "google", email: "", profile: { email_verified: true }, accessToken: "x" })).toBe(false)
    expect(await isVerifiedOAuthEmail({ provider: "twitter", email: "a@b.co", profile: {}, accessToken: "x" })).toBe(false)
  })
})

describe("isSignedInAsSomeoneElse", () => {
  it("is false with no session, so a normal sign-in goes ahead", async () => {
    expect(await isSignedInAsSomeoneElse(undefined, "victim@example.com")).toBe(false)
    expect(userFindUnique).not.toHaveBeenCalled()
  })

  it("is true when the session belongs to another email — the login CSRF case", async () => {
    userFindUnique.mockResolvedValueOnce({ email: "attacker@example.com" })
    expect(await isSignedInAsSomeoneElse("attacker-id", "victim@example.com")).toBe(true)
  })

  it("is false for the same email, in any case", async () => {
    userFindUnique.mockResolvedValueOnce({ email: "ada@example.com" })
    expect(await isSignedInAsSomeoneElse("ada-id", "Ada@Example.com")).toBe(false)
  })

  it("is true when the provider gave no email at all", async () => {
    userFindUnique.mockResolvedValueOnce({ email: "ada@example.com" })
    expect(await isSignedInAsSomeoneElse("ada-id", undefined)).toBe(true)
  })

  it("lets the same user through when this Google account is already linked to them", async () => {
    userFindUnique.mockResolvedValueOnce({ email: "ada@example.com" })
    accountFindUnique.mockResolvedValueOnce({ userId: "ada-id" } as never)
    expect(
      await isSignedInAsSomeoneElse("ada-id", "ada.old@gmail.com", { provider: "google", providerAccountId: "g1" }),
    ).toBe(false)
  })
})
