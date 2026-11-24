import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"

// GET /api/courses - List all published courses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level")
    const includeUnpublished = searchParams.get("includeUnpublished") === "true"

    // Check if user is admin for unpublished courses
    const session = await auth()
    const isAdmin = session?.user?.role === "ADMIN"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as in Botcamp
    const where: any = {}

    // Only show published courses unless admin requests unpublished
    if (!isAdmin || !includeUnpublished) {
      where.published = true
    }

    if (level) {
      where.level = level
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        sections: {
          include: {
            lessons: {
              select: {
                id: true,
                duration: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    })

    // Transform to include computed fields
    const transformedCourses = courses.map((course) => {
      const totalLessons = course.sections.reduce(
        (acc, section) => acc + section.lessons.length,
        0
      )
      const totalDuration = course.sections.reduce(
        (acc, section) =>
          acc +
          section.lessons.reduce((lessonAcc, lesson) => lessonAcc + (lesson.duration || 0), 0),
        0
      )

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        level: course.level,
        published: course.published,
        price: course.price,
        tags: course.tags,
        lessonCount: totalLessons,
        duration: totalDuration, // in minutes
        enrolledCount: course._count.enrollments,
      }
    })

    return NextResponse.json({ data: transformedCourses })
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    )
  }
}

// POST /api/courses - Create a new course (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, slug, description, thumbnail, level, price, tags } = body

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existing = await prisma.course.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A course with this slug already exists" },
        { status: 409 }
      )
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description: description || null,
        thumbnail: thumbnail || null,
        level: level || "BASIC",
        price: price || 0,
        tags: tags || [],
        published: false,
      },
    })

    return NextResponse.json({ data: course }, { status: 201 })
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    )
  }
}
