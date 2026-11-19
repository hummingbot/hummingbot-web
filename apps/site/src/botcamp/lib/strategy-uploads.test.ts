/**
 * Upload storage per account. The risk: files and images live in Postgres,
 * and a per-strategy cap alone let one account store 500MB of files and any
 * number of images — and checks made outside a lock let parallel uploads all
 * fit under a cap only one of them had room for.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const MB = 1024 * 1024
let fileBytes: number | null
let imageBytes: number | null
const executeRaw = vi.fn()

vi.mock("@/botcamp/lib/prisma", () => {
  const prisma = {
    strategyFile: { aggregate: vi.fn(async () => ({ _sum: { size: fileBytes } })) },
    strategyImage: { aggregate: vi.fn(async () => ({ _sum: { size: imageBytes } })) },
    $executeRaw: (...args: unknown[]) => executeRaw(...args),
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  }
  return { prisma }
})

const { MAX_UPLOAD_BYTES_PER_USER, storeWithinUploadLimits, uploadQuotaError } = await import("./strategy-uploads")

beforeEach(() => {
  vi.clearAllMocks()
  fileBytes = null
  imageBytes = null
})

describe("uploadQuotaError", () => {
  it("allows uploads up to the cap, files and images together", async () => {
    expect(await uploadQuotaError("u1", 5 * MB)).toBeNull()
    fileBytes = MAX_UPLOAD_BYTES_PER_USER - 3 * MB
    imageBytes = 1 * MB
    expect(await uploadQuotaError("u1", 2 * MB)).toBeNull()
  })

  it("refuses an upload that would go over the cap", async () => {
    fileBytes = MAX_UPLOAD_BYTES_PER_USER - 3 * MB
    imageBytes = 2 * MB
    expect(await uploadQuotaError("u1", 2 * MB)).toMatch(/can total 100MB/)
  })
})

describe("storeWithinUploadLimits", () => {
  const run = (overrides: { role?: string; bytes?: number; checkError?: string | null } = {}) => {
    const store = vi.fn(async () => "stored")
    const result = storeWithinUploadLimits({
      userId: "u1",
      role: overrides.role ?? "STUDENT",
      bytes: overrides.bytes ?? 2 * MB,
      check: async () => overrides.checkError ?? null,
      store,
    })
    return { result, store }
  }

  it("stores under the person's lock when every check passes", async () => {
    const { result, store } = run()
    expect(await result).toEqual({ value: "stored" })
    expect(store).toHaveBeenCalledOnce()
    expect(executeRaw).toHaveBeenCalledOnce()
  })

  it("refuses with the caller's own check, storing nothing", async () => {
    const { result, store } = run({ checkError: "A strategy can hold up to 20 images" })
    expect(await result).toEqual({ error: "A strategy can hold up to 20 images" })
    expect(store).not.toHaveBeenCalled()
  })

  it("refuses an upload over the person's quota, storing nothing", async () => {
    fileBytes = MAX_UPLOAD_BYTES_PER_USER
    const { result, store } = run()
    expect(await result).toMatchObject({ error: expect.stringMatching(/can total 100MB/) })
    expect(store).not.toHaveBeenCalled()
  })

  it("adds a link (0 bytes) even when the person is at the quota", async () => {
    fileBytes = MAX_UPLOAD_BYTES_PER_USER
    expect(await run({ bytes: 0 }).result).toEqual({ value: "stored" })
  })

  it("holds admins to neither check", async () => {
    fileBytes = MAX_UPLOAD_BYTES_PER_USER
    expect(await run({ role: "ADMIN", checkError: "full" }).result).toEqual({ value: "stored" })
  })
})
