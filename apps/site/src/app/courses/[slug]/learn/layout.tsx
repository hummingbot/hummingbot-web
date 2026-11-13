import { notFound } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/preview-session"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

/**
 * Course learn-route gate.
 *
 * We deliberately do NOT redirect non-enrolled users back to the
 * overview — that surprised users who clicked a sidebar lesson and got
 * bounced. The lesson page itself handles per-lesson access (free
 * lessons render for everyone; locked lessons render an in-place
 * `LessonAccessDenied` CTA wrapped in the LearnShell so the sidebar
 * stays visible). The only gate we still enforce here is hiding
 * unpublished courses from non-admins.
 */
export default async function CourseLearnLayout({
  children,
  params,
}: LayoutProps) {
  const { slug } = await params
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, published: true },
  })
  if (!course) notFound()

  if (!course.published) {
    const session = await auth()
    let hasAccess = false
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
      if (user?.role === "ADMIN") hasAccess = true
      else {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: session.user.id, courseId: course.id },
          },
        })
        hasAccess = !!enrollment
      }
    }
    if (!hasAccess) notFound()
  }

  return <>{children}</>
}
