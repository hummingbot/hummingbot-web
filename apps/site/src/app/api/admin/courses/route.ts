import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { CourseLevel } from "@prisma/client"
import {
  requireAdminOrInstructor,
  unauthorizedResponse,
  badRequestResponse,
  conflictResponse,
  successResponse,
  createdResponse,
  serverErrorResponse,
  parseBody,
  validateRequired,
} from "@/botcamp/lib/api-utils"

// Standard course include for responses
const courseInclude = {
  sections: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" as const },
      },
    },
  },
  instructor: {
    select: { id: true, name: true, email: true },
  },
  _count: {
    select: { enrollments: true },
  },
}

// GET /api/admin/courses - Get all courses with full details for admin
export async function GET() {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    // Instructors can only see their own courses
    const whereClause = role === "INSTRUCTOR"
      ? { instructorId: userId }
      : {}

    const courses = await prisma.course.findMany({
      where: whereClause,
      orderBy: { sortOrder: "asc" },
      include: courseInclude,
    })

    return successResponse(courses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    return serverErrorResponse("Failed to fetch courses")
  }
}

// POST /api/admin/courses - Create a new course
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminOrInstructor()
    if (!session) return unauthorizedResponse()

    const userId = session.user.id
    const role = session.user.role

    const body = await parseBody<{
      title: string
      slug: string
      description?: string
      level?: string
      price?: number
      tags?: string[]
      published?: boolean
      instructorId?: string
    }>(request)

    if (!body) return badRequestResponse("Invalid request body")

    // Validate required fields
    const missing = validateRequired(body as Record<string, unknown>, ["title", "slug"])
    if (missing.length > 0) {
      return badRequestResponse(`${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} required`)
    }

    const { title, slug, description, level, price, tags, published, instructorId } = body

    // Check if slug already exists
    const existing = await prisma.course.findUnique({ where: { slug } })
    if (existing) {
      return conflictResponse("A course with this slug already exists")
    }

    // Determine instructor: admins can specify, instructors are auto-assigned
    let assignedInstructorId: string | null = null
    if (role === "ADMIN") {
      assignedInstructorId = instructorId || null
    } else if (role === "INSTRUCTOR") {
      assignedInstructorId = userId
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description: description || null,
        level: (level as CourseLevel) || CourseLevel.BASIC,
        price: price || 0,
        tags: tags || [],
        published: published || false,
        instructorId: assignedInstructorId,
      },
      include: {
        sections: {
          include: { lessons: true },
        },
        instructor: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Auto-enroll instructor in their course
    if (assignedInstructorId) {
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: assignedInstructorId,
            courseId: course.id,
          },
        },
        update: {},
        create: {
          userId: assignedInstructorId,
          courseId: course.id,
          pricePaid: 0,
        },
      })
    }

    return createdResponse(course)
  } catch (error) {
    console.error("Error creating course:", error)
    return serverErrorResponse("Failed to create course")
  }
}
