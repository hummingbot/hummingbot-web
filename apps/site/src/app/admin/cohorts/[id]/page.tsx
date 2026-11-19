import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { CohortEditor } from "@/botcamp/components/admin/CohortEditor"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCohort(id: string) {
  // Handle "new" case
  if (id === "new") {
    return null
  }

  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  })

  if (!cohort) return null

  // Convert dates to ISO strings for the client component
  return {
    ...cohort,
    startDate: cohort.startDate.toISOString(),
    endDate: cohort.endDate.toISOString(),
    enrollmentCount: cohort._count.enrollments,
    weeks: cohort.weeks.map((week) => ({
      ...week,
      date: week.date?.toISOString() || null,
      lessons: week.lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        type: lesson.type,
        sortOrder: lesson.sortOrder,
        isFree: lesson.isFree,
        videoId: lesson.videoId,
        duration: lesson.duration,
        content: lesson.content,
        transcript: lesson.transcript,
        slidesURL: lesson.slidesURL,
        quizData: lesson.quizData,
      })),
    })),
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params

  if (id === "new") {
    return { title: "New Cohort - Admin - Botcamp" }
  }

  const cohort = await getCohort(id)

  if (!cohort) {
    return { title: "Cohort Not Found" }
  }

  return {
    title: `Edit Cohort ${cohort.number} - Admin - Botcamp`,
  }
}

export default async function AdminCohortEditorPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  const cohort = await getCohort(id)

  if (id !== "new" && !cohort) {
    notFound()
  }

  return (
    <div className="space-y-bc-6">
      <CohortEditor cohort={cohort} />
    </div>
  )
}
