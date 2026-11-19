import { NextResponse } from "next/server"
import { getActiveHackathon } from "@/botcamp/lib/active-hackathon"

export async function GET() {
  try {
    return NextResponse.json(await getActiveHackathon())
  } catch (error) {
    console.error("Error fetching active hackathon:", error)
    return NextResponse.json(null)
  }
}
