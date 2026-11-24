import { NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"

// Get the next available cohort (ACTIVE first, then first UPCOMING)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First try to find an ACTIVE cohort
    const activeCohort = await prisma.cohort.findFirst({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: "asc" },
    })

    if (activeCohort) {
      return NextResponse.json(activeCohort)
    }

    // If no active cohort, find the first UPCOMING cohort
    const upcomingCohort = await prisma.cohort.findFirst({
      where: { status: "UPCOMING" },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: "asc" },
    })

    if (upcomingCohort) {
      return NextResponse.json(upcomingCohort)
    }

    return NextResponse.json(
      { error: "No active or upcoming cohort available" },
      { status: 404 }
    )
  } catch (error) {
    console.error("Failed to fetch next cohort:", error)
    return NextResponse.json(
      { error: "Failed to fetch next cohort" },
      { status: 500 }
    )
  }
}
