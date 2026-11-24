import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { LessonType, Prisma } from "@prisma/client"
import {
  requireAdminOrInstructor,
  canEditCourse,
  getCourseIdFromSection,
  unauthorizedResponse,
  badRequestResponse,
  conflictResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
  validateRequired,
} from "@/botcamp/lib/api-utils"

// POST /api/admin/lessons - Create a new lesson
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const body = await parseBody<{
      sectionId?: string
      cohortWeekId?: string
      slug: string
      title: string
      type: string
      content?: string
      transcript?: string
      videoId?: string
      duration?: number
      isFree?: boolean
      quizData?: unknown
      sortOrder?: number
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    const missing = validateRequired(body as Record<string, unknown>, ["title", "slug", "type"])
    if (missing.length > 0) {
      return badRequestResponse(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`)
    }

    const {
      sectionId,
      cohortWeekId,
      slug,
      title,
      type,
      content,
      transcript,
      videoId,
      duration,
      isFree,
      quizData,
      sortOrder,
    } = body

    // Exactly one parent. With both, the section check below passed an
    // instructor's own section and the lesson landed in the cohort week too.
    if (!sectionId === !cohortWeekId) {
      return badRequestResponse("Give either sectionId or cohortWeekId, not both")
    }

    // For course sections, verify user has access to the parent course
    if (sectionId) {
      const courseId = await getCourseIdFromSection(sectionId)
      if (!courseId) return badRequestResponse("Section not found")

      const hasAccess = await canEditCourse(userId, role, courseId)
      if (!hasAccess) return unauthorizedResponse("You don't have permission to add lessons to this course")
    }
    // Cohort lessons are admin-only
    if (cohortWeekId && role !== "ADMIN") {
      return unauthorizedResponse("Only admins can manage cohort lessons")
    }

    // Check slug uniqueness
    const existingSlug = await prisma.lesson.findUnique({ where: { slug } })
    if (existingSlug) {
      return conflictResponse("A lesson with this slug already exists")
    }

    // Get max sortOrder if not provided
    let order = sortOrder
    if (order === undefined) {
      const maxLesson = await prisma.lesson.findFirst({
        where: sectionId ? { sectionId } : { cohortWeekId },
        orderBy: { sortOrder: "desc" },
      })
      order = (maxLesson?.sortOrder ?? -1) + 1
    }

    const lesson = await prisma.lesson.create({
      data: {
        slug,
        title,
        type: type as LessonType,
        content: content || null,
        transcript: transcript || null,
        videoId: videoId || null,
        duration: duration || null,
        isFree: isFree || false,
        quizData: quizData ? (quizData as Prisma.InputJsonValue) : Prisma.DbNull,
        sortOrder: order,
        sectionId: sectionId || null,
        cohortWeekId: cohortWeekId || null,
      },
    })

    return createdResponse(lesson)
  } catch (error) {
    console.error("Error creating lesson:", error)
    return serverErrorResponse("Failed to create lesson")
  }
}
