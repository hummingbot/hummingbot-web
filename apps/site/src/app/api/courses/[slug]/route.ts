import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/courses/[slug] - Get course details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const session = await auth()
    const userId = session?.user?.id
    const isAdmin = session?.user?.role === "ADMIN"

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                slug: true,
                title: true,
                type: true,
                duration: true,
                isFree: true,
                // Only include content for enrolled users or free lessons
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
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if course is published (unless user is admin)
    if (!course.published && !isAdmin) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if user is enrolled
    let isEnrolled = false
    if (userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
      })
      isEnrolled = !!enrollment
    }

    // Calculate totals
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

    return NextResponse.json({
      data: {
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
        duration: totalDuration,
        enrolledCount: course._count.enrollments,
        sections: course.sections,
        isEnrolled,
        canAccess: isEnrolled || isAdmin,
      },
    })
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
}

// PUT /api/courses/[slug] - Update course (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      slug: newSlug,
      description,
      thumbnail,
      level,
      price,
      tags,
      published,
    } = body

    // Check if course exists
    const existing = await prisma.course.findUnique({
      where: { slug },
    })

    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if new slug conflicts (if changing slug)
    if (newSlug && newSlug !== slug) {
      const slugConflict = await prisma.course.findUnique({
        where: { slug: newSlug },
      })
      if (slugConflict) {
        return NextResponse.json(
          { error: "A course with this slug already exists" },
          { status: 409 }
        )
      }
    }

    const course = await prisma.course.update({
      where: { slug },
      data: {
        title: title ?? existing.title,
        slug: newSlug ?? existing.slug,
        description: description !== undefined ? description : existing.description,
        thumbnail: thumbnail !== undefined ? thumbnail : existing.thumbnail,
        level: level ?? existing.level,
        price: price !== undefined ? price : existing.price,
        tags: tags ?? existing.tags,
        published: published !== undefined ? published : existing.published,
      },
    })

    return NextResponse.json({ data: course })
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    )
  }
}

// DELETE /api/courses/[slug] - Delete course (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { slug },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    await prisma.course.delete({
      where: { slug },
    })

    return NextResponse.json({ message: "Course deleted" })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    )
  }
}
