import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { StrategyStatus, Visibility } from "@prisma/client"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
  validateRequired,
} from "@/botcamp/lib/api-utils"
import { strategyInputError } from "@/botcamp/lib/strategy-input"

// Helper to generate slug from title and cohort number
function generateSlug(title: string, cohortNumber: number) {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `cohort-${cohortNumber}-${baseSlug}`
}

// POST /api/admin/strategies - Create a new strategy
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const body = await parseBody<{
      title: string
      slug?: string
      cohortId: string
      authorId?: string
      summary?: string
      details?: string
      tags?: string[]
      exchanges?: string[]
      videoURL?: string
      status?: string
      visibility?: string
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    const missing = validateRequired(body as Record<string, unknown>, ["title", "cohortId"])
    if (missing.length > 0) {
      return badRequestResponse(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`)
    }

    const inputError = strategyInputError(body)
    if (inputError) return badRequestResponse(inputError)

    const {
      title,
      slug: providedSlug,
      cohortId,
      authorId,
      summary,
      details,
      tags,
      exchanges,
      videoURL,
      status,
      visibility,
    } = body

    // Get cohort number for slug generation
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { number: true },
    })

    if (!cohort) {
      return badRequestResponse("Invalid cohort ID")
    }

    // Generate slug if not provided
    const slug = providedSlug || generateSlug(title, cohort.number)

    // Check if slug already exists
    const existingStrategy = await prisma.strategy.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (existingStrategy) {
      return badRequestResponse("A strategy with this slug already exists")
    }

    // Create strategy with optional author
    const strategy = await prisma.strategy.create({
      data: {
        title,
        slug,
        cohortId,
        summary: summary || null,
        details: details || null,
        tags: tags || [],
        exchanges: exchanges || [],
        videoURL: videoURL || null,
        status: (status as StrategyStatus) || StrategyStatus.DRAFT,
        visibility: (visibility as Visibility) || Visibility.PRIVATE,
        ...(authorId && {
          authors: {
            create: {
              userId: authorId,
            },
          },
        }),
      },
    })

    return createdResponse(strategy)
  } catch (error) {
    console.error("Failed to create strategy:", error)
    return serverErrorResponse("Failed to create strategy")
  }
}
