import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { CourseEditor } from "@/botcamp/components/admin/CourseEditor"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCourse(id: string, userId: string, role: string) {
  // Handle "new" case
  if (id === "new") {
    return null
  }

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      instructor: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!course) return null

  // Check access: admins can view all, instructors only their own
  if (role === "INSTRUCTOR" && course.instructorId !== userId) {
    return null
  }

  return course
}

async function getInstructors() {
  return prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "INSTRUCTOR"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  })
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params

  if (id === "new") {
    return { title: "New Course - Admin - Botcamp" }
  }

  // For metadata, we just need a basic query
  const course = await prisma.course.findUnique({
    where: { id },
    select: { title: true },
  })

  if (!course) {
    return { title: "Course Not Found" }
  }

  return {
    title: `Edit ${course.title} - Admin - Botcamp`,
  }
}

export default async function AdminCourseEditorPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    redirect("/signin")
  }

  const role = session.user.role
  const userId = session.user.id

  // Only ADMIN and INSTRUCTOR can access
  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    redirect("/dashboard")
  }

  const isAdmin = role === "ADMIN"

  const course = await getCourse(id, userId, role)

  if (id !== "new" && !course) {
    notFound()
  }

  // Get instructors list for admin
  const instructors = isAdmin ? await getInstructors() : []

  return (
    <div className="space-y-bc-6">
      <CourseEditor
        course={course}
        isAdmin={isAdmin}
        instructors={instructors}
      />
    </div>
  )
}
