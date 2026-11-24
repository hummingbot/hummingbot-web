import { NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { requireAdmin } from "@/botcamp/lib/api-utils"

// Escapes a value for safe inclusion in a CSV cell.
function csvCell(value: string | null): string {
  const v = value ?? ""
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

// GET /api/admin/newsletter-export
// Downloads opted-in users as a Substack-importable CSV (email, first_name, last_name).
export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const subscribers = await prisma.user.findMany({
    where: { newsletterSubscribed: true },
    select: { email: true, firstName: true, lastName: true },
    orderBy: { email: "asc" },
  })

  const header = "email,first_name,last_name"
  const rows = subscribers.map((u) =>
    [csvCell(u.email), csvCell(u.firstName), csvCell(u.lastName)].join(",")
  )
  const csv = [header, ...rows].join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-subscribers.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
