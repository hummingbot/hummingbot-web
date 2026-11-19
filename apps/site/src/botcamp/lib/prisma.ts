import 'server-only'
import { PrismaClient } from '@prisma/client'

// Botcamp's database, shared with botcamp.xyz. This site now reads and writes
// its rows (sign-in, and each Botcamp feature as it's ported), but the schema
// stays Botcamp's: never `prisma db push` or migrate from here.

const globalForPrisma = globalThis as unknown as {
  botcampPrisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.botcampPrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.botcampPrisma = prisma
