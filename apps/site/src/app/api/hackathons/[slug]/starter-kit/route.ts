import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { STARTING_CAPITAL_QUOTE } from "@/botcamp/lib/hackathon-squads"
import { parseRaceHosts, resolveStarterKit } from "@/botcamp/lib/hackathon-starter-kit"
import { STARTER_EMPTY_DIRS, buildStarterPackage } from "@/botcamp/lib/hackathon-starter-kit-package"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/hackathons/[slug]/starter-kit - The starter package as a zip.
// Public, with <placeholders> for host/team/agent. A builder selected by a
// team in this hackathon gets their own values filled in — the host only when
// there's exactly one, since hosts are never shown to anyone else.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true, slug: true, title: true, status: true, starterKit: true, raceHosts: true },
    })
    if (!hackathon || hackathon.status === "DRAFT") {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 })
    }

    let personal: { serverName?: string; team: string; agent?: string } | null = null
    const session = await auth()
    if (session?.user?.id) {
      const selected = await prisma.application.findFirst({
        where: { hackathonId: hackathon.id, userId: session.user.id, selectedTeamId: { not: null } },
        select: { selectedTeam: { select: { slug: true } }, strategy: { select: { slug: true } } },
      })
      if (selected?.selectedTeam) {
        const hosts = hackathon.raceHosts ? parseRaceHosts(hackathon.raceHosts) : null
        const onlyHost = hosts && "hosts" in hosts && hosts.hosts.length === 1 ? hosts.hosts[0].name : undefined
        personal = {
          serverName: onlyHost,
          team: selected.selectedTeam.slug,
          agent: selected.strategy?.slug ?? undefined,
        }
      }
    }

    const files = buildStarterPackage(resolveStarterKit(hackathon.starterKit).kit, {
      hackathonTitle: hackathon.title,
      startingCapital: STARTING_CAPITAL_QUOTE,
      ...personal,
    })
    const zip = new JSZip()
    for (const dir of STARTER_EMPTY_DIRS) zip.folder(dir)
    for (const file of files) zip.file(file.path, file.content)
    const buffer = await zip.generateAsync({ type: "nodebuffer" })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="starter-kit-${hackathon.slug}.zip"`,
        // Personalized for seated builders, so never shared between users.
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("Failed to build starter kit:", error)
    return NextResponse.json({ error: "Failed to build starter kit" }, { status: 500 })
  }
}
