import { NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"

export async function GET() {
  try {
    const cohort = await prisma.cohort.findFirst({
      where: {
        status: {
          in: ["ACTIVE", "UPCOMING"],
        },
      },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        number: true,
        slug: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        price: true,
      },
    })

    if (!cohort) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      id: cohort.id,
      number: cohort.number,
      slug: cohort.slug,
      title: cohort.title,
      status: cohort.status,
      startDate: cohort.startDate.toISOString(),
      endDate: cohort.endDate.toISOString(),
      price: cohort.price,
    })
  } catch (error) {
    console.error("Error fetching active cohort:", error)
    return NextResponse.json(null)
  }
}
