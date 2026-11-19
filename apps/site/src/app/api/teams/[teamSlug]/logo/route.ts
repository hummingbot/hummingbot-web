import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { IMAGE_TYPES_WITH_SVG, readImageUpload, uploadedImageResponse } from "@/botcamp/lib/uploaded-image"
import {
  requireTeamMember,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"
import { safeCallbackUrl } from "@/botcamp/lib/app-url"
import { botcampPublicAssetUrl } from "@/botcamp/lib/botcamp-assets"

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

interface RouteParams {
  params: Promise<{ teamSlug: string }>
}

function isDarkVariant(request: NextRequest): boolean {
  return new URL(request.url).searchParams.get("variant") === "dark"
}

// GET /api/teams/[teamSlug]/logo?variant=light|dark - serve a team's logo image
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamSlug } = await params
    const dark = isDarkVariant(request)

    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      select: {
        logoData: true,
        logoMimeType: true,
        logoUrl: true,
        logoDataDark: true,
        logoMimeTypeDark: true,
        logoUrlDark: true,
      },
    })
    if (!team) return notFoundResponse("Team not found")

    const data = dark ? team.logoDataDark : team.logoData
    const mimeType = dark ? team.logoMimeTypeDark : team.logoMimeType
    const url = dark ? team.logoUrlDark : team.logoUrl

    if (data && mimeType) {
      return uploadedImageResponse(data, mimeType)
    }

    // Same-site paths only (the team PATCH enforces it; older rows may not)
    const path = url ? safeCallbackUrl(url, "") : ""
    // Paths into Botcamp's public/ folder are served here under /botcamp-assets/.
    if (path) return NextResponse.redirect(new URL(botcampPublicAssetUrl(path) ?? path, request.url))

    return notFoundResponse("No logo found")
  } catch (error) {
    console.error("Failed to get team logo:", error)
    return serverErrorResponse("Failed to get team logo")
  }
}

// POST /api/teams/[teamSlug]/logo?variant=light|dark - team members upload a logo image
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamSlug } = await params
    const team = await prisma.team.findUnique({ where: { slug: teamSlug } })
    if (!team) return notFoundResponse("Team not found")

    const session = await requireTeamMember(team.id)
    if (!session) return unauthorizedResponse()

    const dark = isDarkVariant(request)

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return badRequestResponse("No file provided")

    // SVG wordmarks are allowed for sponsors; uploadedImageResponse serves
    // them sandboxed, so one can't run script even when opened directly.
    const upload = await readImageUpload(file, IMAGE_TYPES_WITH_SVG, MAX_SIZE)
    if ("error" in upload) return badRequestResponse(upload.error)

    // logoUrl/logoUrlDark stay populated (pointing back at this route, with a
    // cache-busting version) rather than being nulled out — every existing
    // consumer across the site renders those fields directly as an <img src>,
    // so this keeps uploaded logos working everywhere with no other changes.
    const version = Date.now()
    const canonicalUrl = dark
      ? `/api/teams/${team.slug}/logo?variant=dark&v=${version}`
      : `/api/teams/${team.slug}/logo?v=${version}`

    await prisma.team.update({
      where: { id: team.id },
      data: dark
        ? { logoDataDark: upload.data, logoMimeTypeDark: upload.mimeType, logoUrlDark: canonicalUrl }
        : { logoData: upload.data, logoMimeType: upload.mimeType, logoUrl: canonicalUrl },
    })

    return successResponse({ logoUrl: canonicalUrl })
  } catch (error) {
    console.error("Failed to upload team logo:", error)
    return serverErrorResponse("Failed to upload team logo")
  }
}

// DELETE /api/teams/[teamSlug]/logo?variant=light|dark - remove a team's logo image
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamSlug } = await params
    const team = await prisma.team.findUnique({ where: { slug: teamSlug } })
    if (!team) return notFoundResponse("Team not found")

    const session = await requireTeamMember(team.id)
    if (!session) return unauthorizedResponse()

    const dark = isDarkVariant(request)

    await prisma.team.update({
      where: { id: team.id },
      data: dark
        ? { logoDataDark: null, logoMimeTypeDark: null, logoUrlDark: null }
        : { logoData: null, logoMimeType: null, logoUrl: null },
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error("Failed to delete team logo:", error)
    return serverErrorResponse("Failed to delete team logo")
  }
}
