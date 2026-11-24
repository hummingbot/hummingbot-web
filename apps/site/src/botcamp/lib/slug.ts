import { randomInt } from 'crypto'
import slugify from 'slugify'
import { prisma } from './prisma'

// No digits and no look-alikes (i/l/o), so a suffix never reads as a number.
const SUFFIX_LETTERS = 'abcdefghjkmnpqrstuvwxyz'
const randomLetters = (n: number) => Array.from({ length: n }, () => SUFFIX_LETTERS[randomInt(SUFFIX_LETTERS.length)]).join('')

export async function generateUniqueSlug(
  name: string,
  model: 'student' | 'user' | 'course' | 'strategy' = 'student',
  excludeId?: number,
  /** For a strategy: the author whose username disambiguates a taken slug. */
  authorId?: string
): Promise<string> {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  })

  let slug = baseSlug
  let counter = 1

  // Check if slug exists based on model type
  const checkSlugExists = async (slugToCheck: string): Promise<boolean> => {
    switch (model) {
      case 'user':
        return !!(await prisma.user.findUnique({ where: { slug: slugToCheck } }))
      case 'course':
        return !!(await prisma.course.findUnique({ where: { slug: slugToCheck } }))
      case 'strategy':
        // excludeId lets renaming a strategy keep its own slug match from counting as taken
        return !!(await prisma.strategy.findFirst({
          where: { slug: slugToCheck, ...(excludeId !== undefined ? { id: { not: excludeId } } : {}) },
        }))
      case 'student':
      default:
        return !!(await prisma.student.findUnique({ where: { slug: slugToCheck } }))
    }
  }

  if (model === 'strategy') {
    return uniqueStrategySlug(baseSlug, checkSlugExists, excludeId, authorId)
  }

  while (await checkSlugExists(slug)) {
    counter++
    slug = `${baseSlug}-${counter}`
  }

  return slug
}

// A strategy's slug is how Condor addresses an agent, shown next to its version
// numbers, so a taken one never gets a bare number: `grid-bot-2` reads as
// version 2 of `grid-bot`. It gets the author's username instead
// (`grid-bot-sofia`), then a few letters if that's taken too. A rename looks
// up the strategy's first author.
async function uniqueStrategySlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>,
  excludeId?: number,
  authorId?: string
): Promise<string> {
  if (!(await exists(baseSlug))) return baseSlug

  const author = authorId
    ? await prisma.user.findUnique({ where: { id: authorId }, select: { slug: true } })
    : excludeId !== undefined
      ? (
          await prisma.strategyAuthor.findFirst({
            where: { strategyId: excludeId },
            orderBy: { createdAt: 'asc' },
            select: { user: { select: { slug: true } } },
          })
        )?.user ?? null
      : null
  const stem = author?.slug && !baseSlug.endsWith(`-${author.slug}`) ? `${baseSlug}-${author.slug}` : baseSlug
  if (stem !== baseSlug && !(await exists(stem))) return stem

  for (;;) {
    const slug = `${stem}-${randomLetters(4)}`
    if (!(await exists(slug))) return slug
  }
}

// Legacy function signature for backward compatibility
export async function generateUniqueStudentSlug(firstName: string, lastName?: string | null): Promise<string> {
  const fullName = lastName ? `${firstName} ${lastName}` : firstName
  return generateUniqueSlug(fullName, 'student')
}
