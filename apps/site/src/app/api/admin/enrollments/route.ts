import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireAdmin,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  conflictResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
} from "@/botcamp/lib/api-utils"
import { setUserAsMember } from "@/botcamp/lib/enrollment-utils"

// POST /api/admin/enrollments - Admin creates enrollment for any user
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const body = await parseBody<{
      userId: string
      courseId?: string
      cohortId?: string
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    const { userId, courseId, cohortId } = body

    if (!userId) {
      return badRequestResponse("userId is required")
    }

    // Must provide either courseId or cohortId (not both)
    if ((!courseId && !cohortId) || (courseId && cohortId)) {
      return badRequestResponse("Must provide either courseId or cohortId (not both)")
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return notFoundResponse("User not found")

    // Handle course enrollment
    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } })
      if (!course) return notFoundResponse("Course not found")

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      })

      if (existingEnrollment) {
        return conflictResponse("User is already enrolled in this course")
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          pricePaid: 0,
        },
        include: {
          course: {
            select: { id: true, title: true },
          },
        },
      })

      return createdResponse(enrollment)
    }

    // Handle cohort enrollment
    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } })
      if (!cohort) return notFoundResponse("Cohort not found")

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { userId_cohortId: { userId, cohortId } },
      })

      if (existingEnrollment) {
        return conflictResponse("User is already enrolled in this cohort")
      }

      // Create enrollment and set isMember flag
      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          cohortId,
        },
        include: {
          cohort: {
            select: { id: true, number: true, title: true },
          },
        },
      })

      // Update user's isMember flag
      await setUserAsMember(userId)

      return createdResponse(enrollment)
    }

    return badRequestResponse("Invalid request")
  } catch (error) {
    console.error("Error creating enrollment:", error)
    return serverErrorResponse("Failed to create enrollment")
  }
}
