import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"
import { auth } from "@/botcamp/lib/auth"
import { HackathonEditor } from "@/botcamp/components/admin/HackathonEditor"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getHackathon(id: string) {
  // Race clock may have moved the stage since the last render.
  await advanceDueHackathonStages()
  // Handle "new" case
  if (id === "new") {
    return null
  }

  const hackathon = await prisma.hackathon.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { sortOrder: "asc" },
      },
      applications: {
        select: {
          id: true,
          teamPreferences: true,
          selectedTeamId: true,
          status: true,
        },
      },
    },
  })

  if (!hackathon) return null

  // Convert dates to ISO strings for the client component
  return {
    ...hackathon,
    startDate: hackathon.startDate.toISOString(),
    endDate: hackathon.endDate.toISOString(),
    registrationStart: hackathon.registrationStart?.toISOString() || null,
    registrationEnd: hackathon.registrationEnd?.toISOString() || null,
    raceStart: hackathon.raceStart?.toISOString() || null,
    raceEnd: hackathon.raceEnd?.toISOString() || null,
    sessions: hackathon.sessions.map((session) => ({
      ...session,
      date: session.date?.toISOString() || null,
    })),
  }
}

async function getAllTeams() {
  const teams = await prisma.team.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      logoUrlDark: true,
    },
  })
  return teams
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params

  if (id === "new") {
    return { title: "New Hackathon - Admin - Botcamp" }
  }

  const hackathon = await getHackathon(id)

  if (!hackathon) {
    return { title: "Hackathon Not Found" }
  }

  return {
    title: `Edit ${hackathon.title} - Admin - Botcamp`,
  }
}

export default async function AdminHackathonEditorPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  const [hackathon, allTeams] = await Promise.all([
    getHackathon(id),
    getAllTeams(),
  ])

  if (id !== "new" && !hackathon) {
    notFound()
  }

  return (
    <div className="space-y-bc-6">
      <HackathonEditor hackathon={hackathon} allTeams={allTeams} />
    </div>
  )
}
