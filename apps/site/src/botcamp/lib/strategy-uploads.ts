import type { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"

// Strategy files and images are stored in Postgres, so what one account can
// upload is capped across every strategy it authors, not only per strategy:
// 50MB of files per strategy, times 10 strategies, was 500MB an account, and
// images had no cap at all. Admins aren't held to these.
export const MAX_UPLOAD_BYTES_PER_USER = 100 * 1024 * 1024
export const MAX_IMAGES_PER_STRATEGY = 20
export const MAX_LINKS_PER_STRATEGY = 50

type Db = Prisma.TransactionClient | typeof prisma

/** Why `userId` can't store `bytes` more across their strategies' files and images, or null. */
export async function uploadQuotaError(userId: string, bytes: number, db: Db = prisma): Promise<string | null> {
  const ownStrategies = { strategy: { authors: { some: { userId } } } }
  const [files, images] = await Promise.all([
    db.strategyFile.aggregate({ where: { ...ownStrategies, type: "FILE" }, _sum: { size: true } }),
    db.strategyImage.aggregate({ where: ownStrategies, _sum: { size: true } }),
  ])
  const used = (files._sum.size ?? 0) + (images._sum.size ?? 0)
  if (used + bytes <= MAX_UPLOAD_BYTES_PER_USER) return null
  return `Your strategies' files and images can total ${MAX_UPLOAD_BYTES_PER_USER / (1024 * 1024)}MB — delete some before uploading more`
}

/**
 * Stores an upload of `bytes` (0 for a link) with `store`, after the caller's
 * own check (a per-strategy count) and the per-person quota. The checks and
 * the insert share one transaction under a per-person lock, so parallel
 * uploads can't all fit under a cap that only one of them had room for.
 * Admins skip both checks.
 */
export async function storeWithinUploadLimits<T>({
  userId,
  role,
  bytes,
  check,
  store,
}: {
  userId: string
  role: string
  bytes: number
  check: (tx: Prisma.TransactionClient) => Promise<string | null>
  store: (tx: Prisma.TransactionClient) => Promise<T>
}): Promise<{ value: T } | { error: string }> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`strategy-uploads:user:${userId}`}))`
      if (role !== "ADMIN") {
        const error = (await check(tx)) ?? (bytes > 0 ? await uploadQuotaError(userId, bytes, tx) : null)
        if (error) return { error }
      }
      return { value: await store(tx) }
    },
    // A 4.5MB insert can outlast Prisma's 5s default on a cold connection.
    { timeout: 20_000 },
  )
}
