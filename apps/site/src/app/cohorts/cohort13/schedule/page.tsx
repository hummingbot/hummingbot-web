import { prisma } from "@/botcamp/lib/prisma"
import CohortSchedule from "@/botcamp/components/sections/cohorts/CohortSchedule"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"

// Botcamp's public Cohort 13 schedule (botcamp.xyz/cohorts/cohort13/schedule),
// built from the cohort's weeks and lessons in its database.

export const dynamic = "force-dynamic"

const TELEGRAM_LINK = "https://t.me/botcampcohorts"
const COHORT_NUMBER = 13

export const metadata = {
  title: "Cohort 13 Schedule - Botcamp",
  description: "Full schedule for Botcamp Cohort 13 - Weekly breakdown of live sessions, office hours, and assignments",
}

async function getCohortScheduleFromDB(cohortNumber: number) {
  const cohort = await prisma.cohort.findUnique({
    where: { number: cohortNumber },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  })

  if (!cohort) return []

  return cohort.weeks.map((week) => ({
    week: week.weekNumber,
    title: week.title,
    description: week.description || "",
    sessions: week.lessons.map((lesson) => {
      // Parse session metadata from lesson content (stored as JSON)
      let sessionData: {
        sessionType?: string
        sessionDate?: string
        sessionTime?: string
        description?: string
      } = {}

      try {
        if (lesson.content) {
          sessionData = JSON.parse(lesson.content)
        }
      } catch {
        // If parsing fails, use defaults
      }

      return {
        date: sessionData.sessionDate || week.date?.toISOString().split("T")[0] || "",
        time: sessionData.sessionTime || "15:00 UTC",
        type: sessionData.sessionType || lesson.type.toLowerCase(),
        title: lesson.title,
        description: sessionData.description || "",
        videoId: lesson.videoId,
        isFree: lesson.isFree,
      }
    }),
  }))
}

export default async function Cohort13SchedulePage() {
  const scheduleWeeks = await getCohortScheduleFromDB(COHORT_NUMBER)

  return (
    <div className={`min-h-screen flex flex-col ${pageBackgrounds.cohorts}`}>
      <SiteHeader />
      <main className="flex-1">
        <CohortSchedule
          // Botcamp's "Enroll Now" goes to the cohort 13 landing, which now
          // redirects to the recap (the cohort is over); here it goes to the
          // cohorts on /botcamp, where enrolling in the next one starts.
          cohortLink="/botcamp#cohorts"
          helioLink={TELEGRAM_LINK}
          cohortNumber={COHORT_NUMBER}
          weeks={scheduleWeeks}
          landingLink="/cohorts/cohort13"
        />
      </main>
      <SiteFooter />
    </div>
  )
}
