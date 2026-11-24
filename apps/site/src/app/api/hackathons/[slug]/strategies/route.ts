import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { notFoundResponse, serverErrorResponse, successResponse } from "@/botcamp/lib/api-utils"

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/hackathons/[slug]/strategies - Public catalog of a hackathon's
// competing strategies that an admin opened up after the race (featured +
// isFree, see scripts/feature-hackathon-strategies.ts), for tools like
// Condor's importer. The listing is public metadata, like /strategies; each
// entry's downloadUrl (download-all) still requires sign-in, and isFree lets
// any signed-in user through without a membership or unlock. PRIVATE
// strategies and ones with no files are left out, since there's nothing a
// client could fetch.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const hackathon = await prisma.hackathon.findUnique({
      where: { slug },
      select: { id: true, slug: true, title: true, status: true },
    })
    if (!hackathon || hackathon.status === "DRAFT") {
      return notFoundResponse("Hackathon not found")
    }

    const strategies = await prisma.strategy.findMany({
      where: {
        featured: true,
        isFree: true,
        visibility: { not: "PRIVATE" },
        // Something to import: loose files, or — for an agent, which takes
        // none — an approved package (the downloadUrl below).
        OR: [{ files: { some: {} } }, { agentVersions: { some: { status: "APPROVED" } } }],
        applications: {
          some: { hackathonId: hackathon.id, status: { in: ["FINALIZED", "REVIEWED"] } },
        },
      },
      select: {
        slug: true,
        title: true,
        summary: true,
        strategyType: true,
        tags: true,
        exchanges: true,
        updatedAt: true,
        agentVersions: { where: { status: "APPROVED" }, select: { version: true }, orderBy: { version: "desc" }, take: 1 },
        authors: {
          select: { user: { select: { firstName: true, lastName: true, slug: true } } },
        },
        applications: {
          where: { hackathonId: hackathon.id },
          select: {
            rank: true,
            selectedTeam: { select: { slug: true, name: true } },
          },
        },
      },
      orderBy: { title: "asc" },
    })

    const response = successResponse({
      hackathon: { slug: hackathon.slug, title: hackathon.title },
      strategies: strategies.map(({ authors, applications, agentVersions, ...s }) => ({
        ...s,
        authors: authors.map(({ user }) => ({
          name: [user.firstName, user.lastName].filter(Boolean).join(" "),
          slug: user.slug,
        })),
        team: applications[0]?.selectedTeam ?? null,
        rank: applications[0]?.rank ?? null,
        url: new URL(`/hub/${s.slug}`, request.url).toString(),
        // An approved agent's reviewed package, which Condor clones; its old
        // loose files aren't served once it has one.
        downloadUrl: new URL(
          agentVersions.length > 0
            ? `/api/agents/${s.slug}/versions/latest`
            : `/api/strategies/${s.slug}/files/download-all`,
          request.url,
        ).toString(),
        agentVersion: agentVersions[0]?.version ?? null,
      })),
    })
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600")
    return response
  } catch (error) {
    console.error("Error fetching hackathon strategies:", error)
    return serverErrorResponse("Failed to fetch hackathon strategies")
  }
}
