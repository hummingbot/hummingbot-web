import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { LessonEditor } from "@/botcamp/components/admin/LessonEditor"

interface PageProps {
  params: Promise<{ id: string; lessonId: string }>
}

async function getLesson(lessonId: string, courseId: string, userId: string, role: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      section: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              instructorId: true,
            },
          },
        },
      },
    },
  })

  if (!lesson?.section?.course) return null

  // Check the course ID matches
  if (lesson.section.course.id !== courseId) return null

  // Check access: admins can view all, instructors only their own
  if (role === "INSTRUCTOR" && lesson.section.course.instructorId !== userId) {
    return null
  }

  return {
    lesson,
    course: lesson.section.course,
    section: lesson.section,
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id, lessonId } = await params
  const session = await auth()

  if (!session?.user) {
    return { title: "Lesson Editor - Admin - Botcamp" }
  }

  const data = await getLesson(lessonId, id, session.user.id, session.user.role)

  if (!data) {
    return { title: "Lesson Not Found" }
  }

  return {
    title: `Edit ${data.lesson.title} - ${data.course.title} - Admin - Botcamp`,
  }
}

export default async function AdminLessonEditorPage({ params }: PageProps) {
  const { id: courseId, lessonId } = await params
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

  const data = await getLesson(lessonId, courseId, userId, role)

  if (!data) {
    notFound()
  }

  return (
    <LessonEditor
      lesson={data.lesson}
      course={data.course}
    />
  )
}
