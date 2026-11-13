import { redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/preview-session"
import { getCompletedLessonIds, resolveResumeLesson } from "@/botcamp/lib/lesson-progress"

interface PageProps {
  params: Promise<{ cohortNumber: string }>
}

async function getResumeLessonSlug(cohortNumber: number, userId: string | undefined) {
  const cohort = await prisma.cohort.findUnique({
    where: { number: cohortNumber },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, slug: true },
          },
        },
      },
    },
  })

  const lessons = cohort?.weeks.flatMap((week) => week.lessons) ?? []
  const completedLessonIds = await getCompletedLessonIds(userId, lessons.map((l) => l.id))
  return resolveResumeLesson(lessons, completedLessonIds)?.slug
}

export default async function CohortLearnPage({ params }: PageProps) {
  const { cohortNumber: cohortNumberStr } = await params
  const cohortNumber = parseInt(cohortNumberStr.replace("cohort", ""))

  if (!isNaN(cohortNumber)) {
    const session = await auth()
    const resumeLessonSlug = await getResumeLessonSlug(cohortNumber, session?.user?.id)

    if (resumeLessonSlug) {
      redirect(`/cohorts/cohort${cohortNumber}/learn/${resumeLessonSlug}`)
    }
  }

  // Fallback if no lessons exist
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">No lessons yet</h1>
        <p className="text-muted-foreground">
          This cohort doesn&apos;t have any lessons yet.
        </p>
      </div>
    </div>
  )
}
