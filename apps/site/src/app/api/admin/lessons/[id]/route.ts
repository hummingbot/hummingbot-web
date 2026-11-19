import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { LessonType, Prisma } from "@prisma/client"
import {
  requireAdminOrInstructor,
  canEditCourse,
  getCourseIdFromLesson,
  getCourseIdFromSection,
  unauthorizedResponse,
  notFoundResponse,
  conflictResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to check if user can edit a lesson
async function canEditLesson(lessonId: string, userId: string, role: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { sectionId: true, cohortWeekId: true }
  })

  if (!lesson) return false

  // Cohort lessons are admin-only
  if (lesson.cohortWeekId) {
    return role === "ADMIN"
  }

  // Course lessons - check course ownership
  if (lesson.sectionId) {
    const courseId = await getCourseIdFromLesson(lessonId)
    if (!courseId) return false
    return canEditCourse(userId, role, courseId)
  }

  return false
}

// GET /api/admin/lessons/[id] - Get lesson details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const { id } = await params

    // Check if user can access this lesson
    const hasAccess = await canEditLesson(id, userId, role)
    if (!hasAccess) return unauthorizedResponse("You don't have access to this lesson")

    const lesson = await prisma.lesson.findUnique({ where: { id } })
    if (!lesson) return notFoundResponse("Lesson not found")

    return successResponse(lesson)
  } catch (error) {
    console.error("Error fetching lesson:", error)
    return serverErrorResponse("Failed to fetch lesson")
  }
}

// PUT /api/admin/lessons/[id] - Update lesson
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const { id } = await params

    // Check if user can edit this lesson
    const hasAccess = await canEditLesson(id, userId, role)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to edit this lesson")

    const existing = await prisma.lesson.findUnique({ where: { id } })
    if (!existing) return notFoundResponse("Lesson not found")

    const body = await parseBody<{
      slug?: string
      title?: string
      type?: string
      content?: string
      transcript?: string
      slidesURL?: string
      videoId?: string
      duration?: number
      isFree?: boolean
      quizData?: unknown
      sortOrder?: number
      sectionId?: string
      cohortWeekId?: string
    }>(request)

    if (!body) return serverErrorResponse("Invalid request body")

    const {
      slug,
      title,
      type,
      content,
      transcript,
      slidesURL,
      videoId,
      duration,
      isFree,
      quizData,
      sortOrder,
      sectionId,
      cohortWeekId,
    } = body

    // Moving a lesson needs the same rights on where it goes as on where it
    // was. An instructor could edit their own lesson and send it into another
    // instructor's course, or into a paid cohort week, which only admins edit.
    if (role !== "ADMIN") {
      if (cohortWeekId !== undefined && cohortWeekId !== existing.cohortWeekId) {
        return unauthorizedResponse("Only admins can move lessons into cohorts")
      }
      if (sectionId !== undefined && sectionId !== existing.sectionId) {
        const targetCourseId = sectionId ? await getCourseIdFromSection(sectionId) : null
        if (!targetCourseId || !(await canEditCourse(userId, role, targetCourseId))) {
          return unauthorizedResponse("You don't have permission to move this lesson there")
        }
      }
    }

    // Check slug conflict
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.lesson.findUnique({ where: { slug } })
      if (slugConflict) {
        return conflictResponse("A lesson with this slug already exists")
      }
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        slug: slug ?? existing.slug,
        title: title ?? existing.title,
        type: (type as LessonType) ?? existing.type,
        content: content !== undefined ? content : existing.content,
        transcript: transcript !== undefined ? transcript : existing.transcript,
        slidesURL: slidesURL !== undefined ? slidesURL : existing.slidesURL,
        videoId: videoId !== undefined ? videoId : existing.videoId,
        duration: duration !== undefined ? duration : existing.duration,
        isFree: isFree !== undefined ? isFree : existing.isFree,
        quizData: quizData !== undefined
          ? (quizData === null ? Prisma.DbNull : quizData as Prisma.InputJsonValue)
          : (existing.quizData === null ? Prisma.DbNull : existing.quizData as Prisma.InputJsonValue),
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        sectionId: sectionId !== undefined ? sectionId : existing.sectionId,
        cohortWeekId: cohortWeekId !== undefined ? cohortWeekId : existing.cohortWeekId,
      },
    })

    return successResponse(lesson)
  } catch (error) {
    console.error("Error updating lesson:", error)
    return serverErrorResponse("Failed to update lesson")
  }
}

// DELETE /api/admin/lessons/[id] - Delete lesson
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const { id } = await params

    // Check if user can delete this lesson
    const hasAccess = await canEditLesson(id, userId, role)
    if (!hasAccess) return unauthorizedResponse("You don't have permission to delete this lesson")

    const lesson = await prisma.lesson.findUnique({ where: { id } })
    if (!lesson) return notFoundResponse("Lesson not found")

    await prisma.lesson.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Error deleting lesson:", error)
    return serverErrorResponse("Failed to delete lesson")
  }
}
