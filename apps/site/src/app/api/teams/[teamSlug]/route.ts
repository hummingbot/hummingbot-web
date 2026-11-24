import { NextRequest } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import {
  requireTeamMember,
  unauthorizedResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
  parseBody,
  badRequestResponse,
} from "@/botcamp/lib/api-utils"
import { safeCallbackUrl } from "@/botcamp/lib/app-url"

interface RouteParams {
  params: Promise<{ teamSlug: string }>
}

interface TeamInfoBody {
  name?: string
  description?: string | null
  logoUrl?: string | null
  logoUrlDark?: string | null
  rules?: string | null
  resources?: string | null
  primaryColor?: string | null
}

// PATCH /api/teams/[teamSlug] - Team members edit their own team's public info
// (name, description, logoUrl, logoUrlDark, rules, resources, primaryColor
// only — slug, sortOrder, and websiteUrl stay admin-only, see
// /api/admin/teams/[id])
function isSameSitePath(value: unknown): boolean {
  return typeof value === "string" && safeCallbackUrl(value, "") === value
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamSlug } = await params
    const existing = await prisma.team.findUnique({ where: { slug: teamSlug } })
    if (!existing) return notFoundResponse("Team not found")

    const session = await requireTeamMember(existing.id)
    if (!session) return unauthorizedResponse()

    const body = await parseBody<TeamInfoBody>(request)
    if (!body) return serverErrorResponse("Invalid request body")

    const { name, description, logoUrl, logoUrlDark, rules, resources, primaryColor } = body

    // GET /api/teams/[slug]/logo redirects to these, so a full URL made our
    // domain an open redirect (and showed any image as the sponsor's logo).
    // Logos are uploaded or live under /logos — same-site paths only.
    for (const value of [logoUrl, logoUrlDark]) {
      if (value != null && !isSameSitePath(value)) {
        return badRequestResponse("Logo URL must be a path on this site, like /logos/name.png — or upload the logo")
      }
    }

    const team = await prisma.team.update({
      where: { id: existing.id },
      data: {
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        logoUrlDark: logoUrlDark !== undefined ? logoUrlDark : existing.logoUrlDark,
        rules: rules !== undefined ? rules : existing.rules,
        resources: resources !== undefined ? resources : existing.resources,
        primaryColor: primaryColor !== undefined ? primaryColor : existing.primaryColor,
      },
    })

    return successResponse(team)
  } catch (error) {
    console.error("Error updating team info:", error)
    return serverErrorResponse("Failed to update team")
  }
}
