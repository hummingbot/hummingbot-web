import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { sendEmail, emailTemplates } from "@/botcamp/lib/resend"
import {
  requireAuth,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  conflictResponse,
  successResponse,
  createdResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"

// GET /api/enrollments - Get current user's enrollments
export async function GET() {
  try {
    const session = await requireAuth()
    if (!session) return unauthorizedResponse()

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            thumbnail: true,
            level: true,
          },
        },
        cohort: {
          select: {
            id: true,
            slug: true,
            number: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    })

    return successResponse(enrollments)
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return serverErrorResponse("Failed to fetch enrollments")
  }
}

// POST /api/enrollments - Enroll in a course or cohort
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!session) return unauthorizedResponse()

    const body = await request.json()
    const { courseId, cohortId } = body

    // Must provide either courseId or cohortId (not both)
    if ((!courseId && !cohortId) || (courseId && cohortId)) {
      return badRequestResponse("Must provide either courseId or cohortId")
    }

    // Check if already enrolled
    if (courseId) {
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId,
          },
        },
      })

      if (existingEnrollment) {
        return conflictResponse("Already enrolled in this course")
      }

      // Check if course exists and is accessible
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      })

      // An unpublished course doesn't exist yet for students — free or not
      if (!course || !course.published) {
        return notFoundResponse("Course not found")
      }

      // For paid courses, require payment via checkout
      if (course.price > 0) {
        return badRequestResponse("Payment required for this course")
      }

      // Get user info for email
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, firstName: true, name: true },
      })

      const enrollment = await prisma.enrollment.create({
        data: {
          userId: session.user.id,
          courseId,
          pricePaid: 0,
        },
        include: {
          course: true,
        },
      })

      // Send enrollment confirmation email
      if (user?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const courseUrl = `${appUrl}/courses/${course.slug}/learn`

        const emailContent = emailTemplates.freeEnrollmentConfirmation({
          userName: user.firstName || user.name || "there",
          courseName: course.title,
          courseUrl,
        })

        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        }).catch((err) => {
          // Log but don't fail enrollment if email fails
          console.error("Failed to send enrollment email:", err)
        })
      }

      return createdResponse(enrollment)
    }

    if (cohortId) {
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_cohortId: {
            userId: session.user.id,
            cohortId,
          },
        },
      })

      if (existingEnrollment) {
        return conflictResponse("Already enrolled in this cohort")
      }

      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
      })

      if (!cohort) {
        return notFoundResponse("Cohort not found")
      }

      // Cohort enrollment always requires payment via /api/checkout (Stripe
      // webhook creates the enrollment) or admin action via
      // /api/admin/enrollments. This endpoint must never create one directly —
      // doing so would let any authenticated user grant themselves isMember for
      // free.
      return badRequestResponse("Payment required for this cohort")
    }

    return badRequestResponse("Invalid request")
  } catch (error) {
    console.error("Error creating enrollment:", error)
    return serverErrorResponse("Failed to create enrollment")
  }
}
