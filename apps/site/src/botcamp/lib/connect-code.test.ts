/**
 * "Connect Botcamp" with a code Botcamp gives. The risks: minting a token
 * without a code the person generated, a code that works twice, after it
 * expires or after a newer one replaced it, telling a guesser which codes
 * exist, a token that never shows up for the person (no email), and guessing
 * past the per-IP cap.
 */

import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeEach } from "vitest"

interface CodeRow {
  id: string
  codeHash: string
  userId: string
  scopes: string[]
  expiresAt: Date
  usedAt: Date | null
  redeemerIp: string | null
}

let codes: CodeRow[] = []
let tokens: { userId: string; name: string; scopes: string[] }[] = []
const session = vi.fn()
const connectedEmail = vi.fn()
const limits = { create: true, redeem: true }

vi.mock("@/botcamp/lib/prisma", () => ({
  prisma: {
    condorConnectCode: {
      deleteMany: vi.fn(async ({ where }: { where: { OR: [{ userId: string; usedAt: null }, { expiresAt: { lt: Date } }] } }) => {
        const [mine, old] = where.OR
        codes = codes.filter((c) => !((c.userId === mine.userId && c.usedAt === null) || c.expiresAt < old.expiresAt.lt))
      }),
      create: vi.fn(async ({ data }: { data: Omit<CodeRow, "id" | "usedAt" | "redeemerIp"> }) => {
        const row = { id: `c${codes.length}`, usedAt: null, redeemerIp: null, ...data }
        codes.push(row)
        return row
      }),
      findUnique: vi.fn(async ({ where }: { where: { codeHash: string } }) => codes.find((c) => c.codeHash === where.codeHash) ?? null),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; usedAt: null }; data: Partial<CodeRow> }) => {
        const row = codes.find((c) => c.id === where.id && c.usedAt === null)
        if (row) Object.assign(row, data)
        return { count: row ? 1 : 0 }
      }),
    },
    apiToken: {
      count: vi.fn(async ({ where }: { where: { userId: string } }) => tokens.filter((t) => t.userId === where.userId).length),
      create: vi.fn(async ({ data }: { data: { userId: string; name: string; scopes: string[] } }) => {
        tokens.push(data)
        return data
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "sofia" ? { id: "sofia", firstName: "Sofia", lastName: "N", email: "s@example.com" } : null,
      ),
    },
  },
}))
vi.mock("@/botcamp/lib/auth", () => ({ auth: () => session() }))
vi.mock("@/botcamp/lib/notifications", () => ({ sendCondorConnectedEmail: (...args: unknown[]) => connectedEmail(...args) }))
vi.mock("@/botcamp/lib/rate-limit", () => ({
  rateLimit: async () => (limits.create ? { ok: true } : { ok: false, retryAfterSeconds: 60 }),
  rateLimitByIp: async () => (limits.redeem ? { ok: true } : { ok: false, retryAfterSeconds: 60 }),
}))

const { normalizeConnectCode, CONNECT_CODE_TTL_SECONDS } = await import("./connect-code")
const createRoute = await import("@/app/api/condor/connect-code/route")
const redeemRoute = await import("@/app/api/condor/connect-code/redeem/route")
const { MAX_API_TOKENS_PER_USER } = await import("./api-tokens")

async function generate(): Promise<{ status: number; code?: string; error?: string }> {
  const res = await createRoute.POST()
  const body = await res.json()
  return { status: res.status, code: body.data?.code, error: body.error }
}

async function redeem(code: unknown, clientName = "condor@laptop") {
  const res = await redeemRoute.POST(
    new NextRequest("http://localhost/api/condor/connect-code/redeem", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ code, client_name: clientName }),
    }),
  )
  return { status: res.status, body: await res.json() }
}

beforeEach(() => {
  codes = []
  tokens = []
  limits.create = true
  limits.redeem = true
  vi.clearAllMocks()
  session.mockResolvedValue({ user: { id: "sofia" } })
})

describe("normalizeConnectCode", () => {
  it("accepts the code however it's pasted, and nothing else", () => {
    expect(normalizeConnectCode("bcdf-ghjk-lmnp")).toBe("BCDFGHJKLMNP")
    expect(normalizeConnectCode(" BCDF GHJK LMNP ")).toBe("BCDFGHJKLMNP")
    expect(normalizeConnectCode("BCDF-GHJK")).toBeNull()
    expect(normalizeConnectCode("ABCD-GHJK-LMNP")).toBeNull() // vowels aren't in the alphabet
  })
})

describe("POST /api/condor/connect-code", () => {
  it("needs a signed-in person", async () => {
    session.mockResolvedValue(null)
    expect((await generate()).status).toBe(401)
  })

  it("hands out a code and stores only its hash, expiring in 10 minutes", async () => {
    const before = Date.now()
    const { status, code } = await generate()
    expect(status).toBe(200)
    expect(code).toMatch(/^[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/)
    expect(codes).toHaveLength(1)
    expect(JSON.stringify(codes[0])).not.toContain(code!.replace(/-/g, ""))
    expect(codes[0].expiresAt.getTime() - before).toBeLessThanOrEqual(CONNECT_CODE_TTL_SECONDS * 1000 + 50)
  })

  it("keeps only the newest code live", async () => {
    const first = (await generate()).code!
    const second = (await generate()).code!
    expect((await redeem(first)).status).toBe(400)
    expect((await redeem(second)).status).toBe(200)
  })

  it("refuses when the person is at the connection cap, and when rate-limited", async () => {
    tokens = Array.from({ length: MAX_API_TOKENS_PER_USER }, () => ({ userId: "sofia", name: "x", scopes: [] }))
    expect((await generate()).status).toBe(400)
    tokens = []
    limits.create = false
    expect((await generate()).status).toBe(429)
  })
})

describe("POST /api/condor/connect-code/redeem", () => {
  it("trades the code for a token once, in the old device flow's shape, and emails the person", async () => {
    const { code } = await generate()
    const first = await redeem(code!.toLowerCase())
    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({
      token_type: "bearer",
      scope: "agents:read agents:publish",
      user: { id: "sofia", name: "Sofia N" },
    })
    expect(first.body.access_token).toMatch(/^bc_/)
    expect(tokens).toEqual([{ userId: "sofia", name: "condor@laptop", scopes: ["agents:read", "agents:publish"], tokenHash: expect.any(String), prefix: expect.any(String), expiresAt: expect.any(Date) }])
    expect(codes[0]).toMatchObject({ usedAt: expect.any(Date), redeemerIp: "203.0.113.7" })
    expect(connectedEmail).toHaveBeenCalledWith("sofia", { clientName: "condor@laptop", requesterIp: "203.0.113.7" })

    const again = await redeem(code)
    expect(again.status).toBe(400)
    expect(again.body.error).toBe("invalid_grant")
    expect(tokens).toHaveLength(1)
  })

  it("answers a wrong, malformed or expired code the same way, minting nothing", async () => {
    const { code } = await generate()
    expect((await redeem("BCDF-GHJK-LMNP")).body.error).toBe("invalid_grant")
    expect((await redeem("nope")).body.error).toBe("invalid_grant")
    codes[0].expiresAt = new Date(Date.now() - 1000)
    expect((await redeem(code)).body.error).toBe("invalid_grant")
    expect((await redeem(undefined)).status).toBe(400)
    expect(tokens).toHaveLength(0)
    expect(connectedEmail).not.toHaveBeenCalled()
  })

  it("is capped per IP against guessing", async () => {
    limits.redeem = false
    const { code } = await generate()
    expect((await redeem(code)).status).toBe(429)
    expect(tokens).toHaveLength(0)
  })
})
