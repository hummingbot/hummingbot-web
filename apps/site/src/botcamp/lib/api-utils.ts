import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/botcamp/lib/auth"
import { prisma } from "@/botcamp/lib/prisma"

/**
 * API Utility Functions
 *
 * Shared utilities to eliminate duplication across API routes
 */

// Standard API response type
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

/**
 * Check if current user is an admin
 * Returns the session if authorized, null otherwise
 */
export async function requireAdmin() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return null
  }

  return session
}

/**
 * Check if current user is an admin or instructor
 * Returns the session if authorized, null otherwise
 */
export async function requireAdminOrInstructor() {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  const role = session.user.role
  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    return null
  }

  return session
}

/**
 * Check if user can edit a specific course
 * Admins can edit any course, instructors can only edit their own
 */
export async function canEditCourse(userId: string, role: string, courseId: string): Promise<boolean> {
  if (role === "ADMIN") return true

  if (role === "INSTRUCTOR") {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true }
    })
    return course?.instructorId === userId
  }

  return false
}

/**
 * Get course ID from a section ID
 */
export async function getCourseIdFromSection(sectionId: string): Promise<string | null> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { courseId: true }
  })
  return section?.courseId ?? null
}

/**
 * Get course ID from a lesson ID (if it belongs to a course section)
 */
export async function getCourseIdFromLesson(lessonId: string): Promise<string | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      sectionId: true,
      section: {
        select: { courseId: true }
      }
    }
  })
  return lesson?.section?.courseId ?? null
}

/**
 * Check if current user is authenticated
 * Returns the session if authenticated, null otherwise
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  return session
}

/**
 * Check if current user is a team member or admin
 * Returns the session if authorized, null otherwise
 */
export async function requireTeamMember(teamId: string) {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  // Admins always have access
  if (session.user.role === "ADMIN") {
    return session
  }

  // Check team membership
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: session.user.id,
      },
    },
  })

  return membership ? session : null
}

/**
 * Check if current user is a member of any team
 * Used for allowing team members to comment on strategies
 */
export async function isAnyTeamMember(userId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
  })
  return !!membership
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Create a bad request response
 */
export function badRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

/**
 * Create a not found response
 */
export function notFoundResponse(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 })
}

/**
 * Create a conflict response (409)
 */
export function conflictResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 409 })
}

/**
 * Create an internal server error response
 */
export function serverErrorResponse(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 })
}

/**
 * Create a success response with data
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(data: T) {
  return successResponse(data, 201)
}

/**
 * Validate required fields in request body
 * Returns array of missing field names, or empty array if all present
 */
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): string[] {
  const missing: string[] = []
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      missing.push(field)
    }
  }
  return missing
}

/**
 * Parse request body with error handling
 */
export async function parseBody<T = Record<string, unknown>>(
  request: NextRequest
): Promise<T | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/**
 * Higher-order function to wrap API handlers with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  errorMessage = "An error occurred"
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      return serverErrorResponse(errorMessage)
    }
  }
}

/**
 * Create an admin-protected GET handler
 */
export function createAdminGetHandler<T>(
  fetcher: () => Promise<T>,
  errorMessage = "Failed to fetch data"
) {
  return async (): Promise<NextResponse> => {
    try {
      const session = await requireAdmin()
      if (!session) return unauthorizedResponse()

      const data = await fetcher()
      return successResponse(data)
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      return serverErrorResponse(errorMessage)
    }
  }
}

/**
 * Create an admin-protected POST handler with validation
 */
export function createAdminPostHandler<TBody, TResult>(
  options: {
    requiredFields?: string[]
    uniqueCheck?: (body: TBody) => Promise<boolean>
    uniqueErrorMessage?: string
    creator: (body: TBody) => Promise<TResult>
    errorMessage?: string
  }
) {
  const {
    requiredFields = [],
    uniqueCheck,
    uniqueErrorMessage = "A record with this value already exists",
    creator,
    errorMessage = "Failed to create record",
  } = options

  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const session = await requireAdmin()
      if (!session) return unauthorizedResponse()

      const body = await parseBody<TBody>(request)
      if (!body) return badRequestResponse("Invalid request body")

      // Validate required fields
      if (requiredFields.length > 0) {
        const missing = validateRequired(body as Record<string, unknown>, requiredFields)
        if (missing.length > 0) {
          return badRequestResponse(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`)
        }
      }

      // Check uniqueness if provided
      if (uniqueCheck) {
        const exists = await uniqueCheck(body)
        if (exists) return conflictResponse(uniqueErrorMessage)
      }

      const result = await creator(body)
      return createdResponse(result)
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      return serverErrorResponse(errorMessage)
    }
  }
}

/**
 * Create an admin-protected PUT handler
 */
export function createAdminPutHandler<TBody, TResult>(
  options: {
    finder: (id: string) => Promise<unknown | null>
    updater: (id: string, body: TBody) => Promise<TResult>
    notFoundMessage?: string
    errorMessage?: string
  }
) {
  const {
    finder,
    updater,
    notFoundMessage = "Record not found",
    errorMessage = "Failed to update record",
  } = options

  return async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    try {
      const session = await requireAdmin()
      if (!session) return unauthorizedResponse()

      const { id } = await params
      const existing = await finder(id)
      if (!existing) return notFoundResponse(notFoundMessage)

      const body = await parseBody<TBody>(request)
      if (!body) return badRequestResponse("Invalid request body")

      const result = await updater(id, body)
      return successResponse(result)
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      return serverErrorResponse(errorMessage)
    }
  }
}

/**
 * Create an admin-protected DELETE handler
 */
export function createAdminDeleteHandler(
  options: {
    finder: (id: string) => Promise<unknown | null>
    deleter: (id: string) => Promise<void>
    notFoundMessage?: string
    errorMessage?: string
  }
) {
  const {
    finder,
    deleter,
    notFoundMessage = "Record not found",
    errorMessage = "Failed to delete record",
  } = options

  return async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    try {
      const session = await requireAdmin()
      if (!session) return unauthorizedResponse()

      const { id } = await params
      const existing = await finder(id)
      if (!existing) return notFoundResponse(notFoundMessage)

      await deleter(id)
      return successResponse({ success: true })
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      return serverErrorResponse(errorMessage)
    }
  }
}
