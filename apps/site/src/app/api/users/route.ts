import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import {
  requireAdmin,
  unauthorizedResponse,
  successResponse,
  serverErrorResponse,
} from "@/botcamp/lib/api-utils"
import { isJsonObject, unsafeProfileLink } from "@/botcamp/lib/validation"

// GET /api/users - Search users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const limit = parseInt(searchParams.get("limit") || "20")

    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        slug: true,
        avatarUrl: true,
        role: true,
      },
      take: limit,
      orderBy: { email: "asc" },
    })

    return successResponse(users)
  } catch (error) {
    console.error("Error searching users:", error)
    return serverErrorResponse("Failed to search users")
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // `null`, `1` or `[]` parse fine but aren't a profile: a 400, not a TypeError
    if (!isJsonObject(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
    }

    // Profile links render as hrefs: http(s) or a bare handle only
    const badLink = unsafeProfileLink(body)
    if (badLink) {
      return NextResponse.json({ error: `${badLink} must be a web address (http:// or https://) or a handle` }, { status: 400 })
    }

    const {
      email,
      firstName,
      lastName,
      role,
      certified,
      slug,
      tagline,
      about,
      avatarUrl,
      websiteUrl,
      linkedin,
      github,
      discord,
      storyUrl,
    } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      )
    }

    // Check if slug is already in use
    if (slug) {
      const existingSlug = await prisma.user.findUnique({
        where: { slug },
      })
      if (existingSlug) {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 400 }
        )
      }
    }

    // Generate slug from email if not provided
    let finalSlug = slug
    if (!finalSlug) {
      const baseSlug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")
      finalSlug = baseSlug
      let counter = 1
      while (await prisma.user.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${baseSlug}-${counter}`
        counter++
      }
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        name: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null,
        role: role || "STUDENT",
        certified: certified || false,
        slug: finalSlug,
        tagline: tagline || null,
        about: about || null,
        avatarUrl: avatarUrl || null,
        websiteUrl: websiteUrl || null,
        linkedin: linkedin || null,
        github: github || null,
        discord: discord || null,
        storyUrl: storyUrl || null,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
