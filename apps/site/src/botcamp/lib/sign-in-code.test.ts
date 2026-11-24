import { describe, expect, it, vi } from "vitest"

const updateMany = vi.fn()
vi.mock("@/botcamp/lib/prisma", () => ({ prisma: { verificationCode: { updateMany: (...a: unknown[]) => updateMany(...a) } } }))

const { claimVerifyAttempt, codesMatch, createMagicLinkToken, generateSignInCode, hashMagicLinkToken, MAX_VERIFY_ATTEMPTS } =
  await import("./sign-in-code")

describe("sign-in codes", () => {
  it("are six digits from node:crypto, not Math.random", () => {
    const random = vi.spyOn(Math, "random")
    for (let i = 0; i < 200; i++) expect(generateSignInCode()).toMatch(/^[1-9]\d{5}$/)
    expect(random).not.toHaveBeenCalled()
    random.mockRestore()
  })

  it("compare exactly", () => {
    expect(codesMatch("123456", "123456")).toBe(true)
    expect(codesMatch("123456", "123457")).toBe(false)
    expect(codesMatch("123456", "12345")).toBe(false)
    expect(codesMatch("123456", "")).toBe(false)
  })
})

describe("magic-link tokens", () => {
  it("carry 256 random bits and store only their hash", () => {
    const { token, tokenHash } = createMagicLinkToken()
    expect(Buffer.from(token, "base64url")).toHaveLength(32)
    expect(tokenHash).toBe(hashMagicLinkToken(token))
    expect(tokenHash).not.toContain(token)
    expect(createMagicLinkToken().token).not.toBe(token)
  })
})

describe("claimVerifyAttempt", () => {
  it("counts the guess in the same UPDATE that checks the cap", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 })
    expect(await claimVerifyAttempt("c1")).toBe(true)
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "c1", attempts: { lt: MAX_VERIFY_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    })
  })

  it("refuses once the code has had its attempts", async () => {
    updateMany.mockResolvedValueOnce({ count: 0 })
    expect(await claimVerifyAttempt("c1")).toBe(false)
  })
})
