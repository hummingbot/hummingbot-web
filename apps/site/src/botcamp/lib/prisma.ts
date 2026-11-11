import 'server-only'
import { PrismaClient } from '@prisma/client'

// Botcamp's database is shared with botcamp.xyz and this site only reads it.
// Every write operation is refused here, so no ported code path can mutate it.
const WRITE_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
])

function createReadOnlyClient() {
  const client = new PrismaClient()
  return client.$extends({
    name: 'botcamp-read-only',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (WRITE_OPERATIONS.has(operation)) {
            throw new Error(`Botcamp data is read-only here: refused ${model}.${operation}`)
          }
          return query(args)
        },
      },
      async $executeRaw() {
        throw new Error('Botcamp data is read-only here: refused $executeRaw')
      },
      async $executeRawUnsafe() {
        throw new Error('Botcamp data is read-only here: refused $executeRawUnsafe')
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as {
  botcampPrisma: ReturnType<typeof createReadOnlyClient> | undefined
}

export const prisma = globalForPrisma.botcampPrisma ?? createReadOnlyClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.botcampPrisma = prisma
