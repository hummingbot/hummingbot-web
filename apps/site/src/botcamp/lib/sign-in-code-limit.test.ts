/**
 * Code emails per IP. The risk: one source mailing codes to any number of
 * addresses — dozens of accounts, or Botcamp's sender flooding other inboxes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

let rows: { key: string; createdAt: Date }[]
const create = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => {
  const prisma = {
    rateLimitHit: {
      deleteMany: vi.fn(),
      findMany: vi.fn(async ({ where }: { where: { key: string; createdAt: { gte: Date } } }) =>
        rows.filter((r) => r.key === where.key && r.createdAt >= where.createdAt.gte),
      ),
      create: (...args: unknown[]) => create(...args),
    },
    $executeRaw: vi.fn(),
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  }
  return { prisma }
})

const { MAX_CODE_EMAILS_PER_IP_PER_HOUR, recordCodeEmail } = await import("./sign-in-code-limit")

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000)

beforeEach(() => {
  vi.clearAllMocks()
  rows = []
})

describe("recordCodeEmail", () => {
  it("records a code email under the cap", async () => {
    expect(await recordCodeEmail("203.0.113.7")).toEqual({ ok: true })
    expect(create).toHaveBeenCalledWith({ data: { key: "sign-in-code:ip:203.0.113.7" } })
  })

  it("refuses past the hourly cap and says when the oldest one leaves the window", async () => {
    rows = Array.from({ length: MAX_CODE_EMAILS_PER_IP_PER_HOUR }, (_, i) => ({ key: "sign-in-code:ip:203.0.113.7", createdAt: minutesAgo(50 - i) }))
    const result = await recordCodeEmail("203.0.113.7")
    expect(result).toMatchObject({ ok: false })
    const retry = "retryAfterSeconds" in result ? result.retryAfterSeconds : 0
    expect(retry).toBeGreaterThan(9 * 60)
    expect(retry).toBeLessThanOrEqual(10 * 60)
    expect(create).not.toHaveBeenCalled()
  })

  it("counts each IP on its own", async () => {
    rows = Array.from({ length: MAX_CODE_EMAILS_PER_IP_PER_HOUR }, () => ({ key: "sign-in-code:ip:203.0.113.7", createdAt: minutesAgo(5) }))
    expect(await recordCodeEmail("198.51.100.2")).toEqual({ ok: true })
  })

  it("counts an IPv6 caller by its /64, so rotating addresses doesn't help", async () => {
    rows = Array.from({ length: MAX_CODE_EMAILS_PER_IP_PER_HOUR }, () => ({ key: "sign-in-code:ip:2001:db8:aa:1::/64", createdAt: minutesAgo(5) }))
    expect(await recordCodeEmail("2001:db8:aa:1:9f3c::42")).toMatchObject({ ok: false })
    expect(await recordCodeEmail("2001:db8:aa:2::1")).toEqual({ ok: true })
  })

  it("doesn't cap without a proxy IP (local dev)", async () => {
    expect(await recordCodeEmail(null)).toEqual({ ok: true })
    expect(create).not.toHaveBeenCalled()
  })
})
