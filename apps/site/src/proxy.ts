import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// First gate for the pages that need an account. Layouts can't see the URL, so
// this is where a signed-out visit keeps it: /signin brings the person back to
// the exact page asked for (/dashboard/team from a team invite, a strategy
// editor link, Condor's /connect, an admin page).
//
// It is not the only check, and never the one that grants access: the pages
// verify the session themselves, the admin layout reads the role from the
// database, and every /api/admin route checks it again (requireAdmin /
// requireAdminOrInstructor), as on Botcamp.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"]

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name) || request.cookies.has(`${name}.0`))
}

function toSignin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl
  const signin = new URL("/signin", request.url)
  signin.searchParams.set("callbackUrl", `${pathname}${search}`)
  return NextResponse.redirect(signin)
}

function isCoursesAdmin(pathname: string): boolean {
  return pathname === "/admin/courses" || pathname.startsWith("/admin/courses/")
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (!hasSessionCookie(request)) return toSignin(request)

  const { pathname } = request.nextUrl
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Botcamp's middleware: instructors only get the course tools. The token
    // is encrypted with AUTH_SECRET, so its role can't be forged; the admin
    // layout still re-reads the role from the database.
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: request.nextUrl.protocol === "https:",
    })
    if (!token) return toSignin(request)
    if (token.role === "INSTRUCTOR" && !isCoursesAdmin(pathname)) {
      return NextResponse.redirect(new URL("/admin/courses", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/connect", "/admin/:path*"],
}
