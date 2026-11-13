import { redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/preview-session"
import { getCompletedLessonIds, resolveResumeLesson } from "@/botcamp/lib/lesson-progress"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getResumeLessonSlug(courseSlug: string, userId: string | undefined) {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, slug: true },
          },
        },
      },
    },
  })

  const lessons = course?.sections.flatMap((section) => section.lessons) ?? []
  const completedLessonIds = await getCompletedLessonIds(userId, lessons.map((l) => l.id))
  return resolveResumeLesson(lessons, completedLessonIds)?.slug
}

export default async function LearnPage({ params }: PageProps) {
  const { slug } = await params
  const session = await auth()
  const resumeLessonSlug = await getResumeLessonSlug(slug, session?.user?.id)

  if (resumeLessonSlug) {
    redirect(`/courses/${slug}/learn/${resumeLessonSlug}`)
  }

  // Fallback if no lessons exist
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">No lessons yet</h1>
        <p className="text-muted-foreground">
          This course doesn&apos;t have any lessons yet.
        </p>
      </div>
    </div>
  )
}
