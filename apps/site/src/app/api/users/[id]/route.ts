import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { geocodeLocation } from "@/botcamp/lib/geocode"
import { isJsonObject, unsafeProfileLink } from "@/botcamp/lib/validation"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/users/[id] - Get a single user
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        certified: true,
        slug: true,
        tagline: true,
        location: true,
        about: true,
        avatarUrl: true,
        websiteUrl: true,
        linkedin: true,
        github: true,
        discord: true,
        storyUrl: true,
        createdAt: true,
        enrollments: {
          select: {
            id: true,
            enrolledAt: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
            cohort: {
              select: {
                id: true,
                number: true,
                title: true,
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
        _count: {
          select: {
            strategies: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    // `null`, `1` or `[]` parse fine but aren't a profile: a 400, not a TypeError
    if (!isJsonObject(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
    }

    const {
      firstName,
      lastName,
      role,
      certified,
      slug,
      tagline,
      location,
      about,
      avatarUrl,
      websiteUrl,
      linkedin,
      github,
      discord,
      storyUrl,
      profileVisibility,
    } = body

    // Profile links render as hrefs: http(s) or a bare handle only
    const badLink = unsafeProfileLink(body)
    if (badLink) {
      return NextResponse.json({ error: `${badLink} must be a web address (http:// or https://) or a handle` }, { status: 400 })
    }

    // Emails are stored lowercased (sign-in looks them up that way)
    const email = typeof body.email === "string" && body.email.trim() ? body.email.toLowerCase().trim() : undefined

    // Check if email is already in use by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
      })
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
    }

    // Check if slug is already in use by another user
    if (slug) {
      const existingSlug = await prisma.user.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      })
      if (existingSlug) {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 400 }
        )
      }
    }

    // Re-geocode when the location text changes.
    let coords: { latitude: number | null; longitude: number | null } | null = null
    if (location !== undefined) {
      const current = await prisma.user.findUnique({ where: { id }, select: { location: true } })
      const nextLocation = location || null
      if (nextLocation !== current?.location) {
        const point = nextLocation ? await geocodeLocation(nextLocation) : null
        coords = { latitude: point?.latitude ?? null, longitude: point?.longitude ?? null }
      }
    }

    // A new email drops the Google/GitHub sign-ins linked under the old one.
    // Those accounts were linked because their email matched; left attached,
    // whoever holds the old address's Google account still signs in here.
    // The person signs in with the new address and links again from there.
    const current = email ? await prisma.user.findUnique({ where: { id }, select: { email: true } }) : null
    const emailChanged = Boolean(email && current && current.email.toLowerCase() !== email)

    // One transaction: if the update fails (say, the email was just taken),
    // the OAuth links stay.
    const user = await prisma.$transaction(async (tx) => {
      if (emailChanged) await tx.account.deleteMany({ where: { userId: id } })
      return tx.user.update({
        where: { id },
        data: {
          email,
          ...(emailChanged && { emailVerified: null }),
          firstName: firstName || null,
          lastName: lastName || null,
          role,
          certified,
          slug: slug || null,
          tagline: tagline || null,
          location: location || null,
          ...(coords ?? {}),
          about: about || null,
          avatarUrl: avatarUrl || null,
          websiteUrl: websiteUrl || null,
          linkedin: linkedin || null,
          github: github || null,
          discord: discord || null,
          storyUrl: storyUrl || null,
          profileVisibility,
        },
      })
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    // Prevent deleting yourself
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
