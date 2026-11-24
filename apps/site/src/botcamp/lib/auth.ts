// Server code only: importing this from a client component fails the build
// instead of shipping secrets' code paths to the browser.
import "server-only"
import NextAuth from "next-auth"
import { cookies } from "next/headers"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { consumeLoginTicket } from "./login-ticket"
import { oauthTermsGate } from "./terms-gate"
import { isSignedInAsSomeoneElse, isVerifiedOAuthEmail } from "./oauth-email"
import { refreshSessionClaims } from "./session-claims"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    // Bounds the life of a stolen session. Active users keep theirs: with
    // JWT sessions the cookie is re-issued with a fresh expiry on every
    // /api/auth/session read, which the client's SessionProvider makes.
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Links to the existing account with this email — safe only because the
      // signIn callback refuses an email the provider hasn't verified.
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      // See Google above: guarded by the signIn callback's verified-email check.
      allowDangerousEmailAccountLinking: true,
    }),
    // Passwordless sign-in. This provider does NOT authenticate on the email
    // address alone — that is a public value. It requires a single-use login
    // ticket that is only minted server-side after the caller proves email
    // ownership via a verification code or magic link (see lib/login-ticket).
    Credentials({
      name: "email-verified",
      credentials: {
        email: { label: "Email", type: "email" },
        ticket: { label: "Login ticket", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Email is required")
        }

        const email = (credentials.email as string).toLowerCase().trim()
        const ticket = credentials.ticket as string | undefined

        // Consume the single-use ticket BEFORE issuing a session. Without a
        // valid ticket, knowing an email address is not enough to sign in.
        const ticketValid = await consumeLoginTicket(email, ticket)
        if (!ticketValid) {
          throw new Error("Invalid or expired login ticket")
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          throw new Error("No account found with this email")
        }

        // Defense in depth: the ticket already implies a verified email, but
        // keep this guard so an unverified account can never hold a session.
        if (!user.emailVerified) {
          throw new Error("Email not verified")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
          isMember: user.isMember,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" && account?.provider !== "github") {
        return true
      }

      // Accounts are linked by email, so an address the provider hasn't
      // verified must never get this far — see lib/oauth-email.ts.
      const verified = await isVerifiedOAuthEmail({
        provider: account.provider,
        email: profile?.email ?? user?.email,
        profile: profile as Record<string, unknown> | undefined,
        accessToken: account.access_token,
      })
      if (!verified) return "/signin?error=email_unverified"

      // Already signed in as someone else? Auth.js would link this Google or
      // GitHub account to that session's user for good. That's login CSRF's
      // payoff: an attacker signs the victim into the attacker's account with
      // a link, the victim then clicks "Sign in with Google", and the
      // attacker holds a working sign-in to the victim's Google identity.
      // Only the same email may continue; anyone else signs out first.
      const current = await auth()
      const oauthAccount = { provider: account.provider, providerAccountId: account.providerAccountId }
      if (await isSignedInAsSomeoneElse(current?.user?.id, profile?.email ?? user?.email, oauthAccount)) {
        return "/signin?error=signed_in_as_other"
      }

      // Terms acceptance gates account CREATION only — see lib/terms-gate.ts
      // for why, and for the tests covering the existing-user carve-out.
      const cookieStore = await cookies()
      const decision = await oauthTermsGate({
        email: profile?.email ?? user?.email,
        agreedCookie: cookieStore.get("tos_agreed")?.value,
      })

      if (decision === "reject") return false
      if (decision === "needs-terms") return "/signup?error=terms_required"
      return true
    },
    async jwt({ token, user, account, profile, trigger }) {
      // On initial sign-in, store user ID and update profile from OAuth data
      if (user && user.id) {
        token.id = user.id
        token.role = (user as { role?: string }).role || "STUDENT"

        // For OAuth sign-ins, update user with profile data (firstName, lastName, avatar)
        // This runs AFTER PrismaAdapter creates the user, so the user exists now
        if ((account?.provider === "google" || account?.provider === "github") && profile) {
          console.log(`[JWT] OAuth sign-in detected, updating profile for user:`, user.id)

          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, slug: true, github: true },
          })

          if (dbUser) {
            const updates: Record<string, string> = {}
            const googleProfile = profile as { given_name?: string; family_name?: string; picture?: string }
            const githubProfile = profile as { avatar_url?: string; login?: string }

            // Set firstName from OAuth profile
            if (!dbUser.firstName) {
              if (googleProfile.given_name) {
                updates.firstName = googleProfile.given_name
              } else if (profile.name) {
                const nameParts = (profile.name as string).split(" ")
                if (nameParts[0]) {
                  updates.firstName = nameParts[0]
                }
              }
            }

            // Set lastName from OAuth profile
            if (!dbUser.lastName) {
              if (googleProfile.family_name) {
                updates.lastName = googleProfile.family_name
              } else if (profile.name) {
                const nameParts = (profile.name as string).split(" ")
                if (nameParts.length > 1) {
                  updates.lastName = nameParts.slice(1).join(" ")
                }
              }
            }

            // Set avatarUrl from OAuth profile
            if (!dbUser.avatarUrl) {
              const profilePicture = googleProfile.picture || githubProfile.avatar_url
              if (profilePicture) {
                updates.avatarUrl = profilePicture
              }
            }

            // Set GitHub username
            if (account.provider === "github" && githubProfile.login && !dbUser.github) {
              updates.github = githubProfile.login
            }

            // Generate slug if missing
            if (!dbUser.slug && user.email) {
              const baseSlug = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")
              let slug = baseSlug
              let counter = 1
              while (await prisma.user.findUnique({ where: { slug } })) {
                slug = `${baseSlug}-${counter}`
                counter++
              }
              updates.slug = slug
            }

            if (Object.keys(updates).length > 0) {
              console.log(`[JWT] Updating profile fields:`, Object.keys(updates))
              await prisma.user.update({
                where: { id: dbUser.id },
                data: updates,
              })
            }
          }

          // Newsletter opt-in and terms acceptance carried from the signup
          // page via short-lived cookies. Newsletter records consent only;
          // opted-in users are exported to Substack via CSV (their endpoint
          // bot-blocks programmatic subscribes).
          try {
            const cookieStore = await cookies()
            const optIn = cookieStore.get("nl_optin")?.value
            const tosAgreed = cookieStore.get("tos_agreed")?.value

            const updates: Record<string, unknown> = {}
            if (optIn === "1") updates.newsletterSubscribed = true
            if (tosAgreed === "1") updates.termsAcceptedAt = new Date()

            if (Object.keys(updates).length > 0) {
              await prisma.user.update({
                where: { id: user.id },
                data: updates,
              })
            }
          } catch (err) {
            console.error("Signup cookie handling failed:", err)
          }
        }

        // Fetch fresh data from database
        const freshUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { avatarUrl: true, name: true, role: true, isMember: true },
        })
        if (freshUser) {
          token.picture = freshUser.avatarUrl
          token.name = freshUser.name
          token.role = freshUser.role
          token.isMember = freshUser.isMember
        }
      }

      // On session refresh (update trigger), refresh data from database
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { avatarUrl: true, name: true, role: true, isMember: true },
        })
        if (dbUser) {
          token.picture = dbUser.avatarUrl
          token.name = dbUser.name
          token.role = dbUser.role
          token.isMember = dbUser.isMember
        }
      }

      // Role and membership follow the database, not the day they signed in
      // — see lib/session-claims.ts. A deleted user is signed out.
      if (user) return { ...token, claimsCheckedAt: Date.now() }
      return refreshSessionClaims(token)
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.isMember = token.isMember as boolean
        // Include avatar from token
        if (token.picture) {
          session.user.image = token.picture as string
        }
      }
      return session
    },
  },
  events: {
    // Fires on every successful sign-in (OAuth + credentials), unlike
    // createUser below which fires once at account creation. Non-fatal: a
    // failed write here should never block sign-in.
    async signIn({ user }) {
      if (!user?.id) return
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
      } catch (err) {
        console.error("Failed to update lastLoginAt:", err)
      }
    },
    // Fires exactly once when the PrismaAdapter creates a new user — i.e. for
    // OAuth (Google/GitHub) sign-ups. Our email magic-link flow creates users
    // itself and sends its own welcome, so it never reaches here (no
    // duplicates). Dynamic import keeps the Resend SDK out of the middleware
    // bundle, since middleware imports `auth`.
    async createUser({ user }) {
      if (!user?.id) return
      // Convert any pending team invites into memberships (non-fatal).
      if (user.email) {
        const { claimTeamInvites } = await import("@/botcamp/lib/team-invites")
        await claimTeamInvites(user.id, user.email)
      }
      try {
        const { sendWelcomeEmail } = await import("@/botcamp/lib/notifications")
        await sendWelcomeEmail(user.id)
      } catch (err) {
        console.error("Failed to send OAuth welcome email:", err)
      }
    },
  },
})

// Get current user from session (for server components)
export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      slug: true,
      avatarUrl: true,
      role: true,
      certified: true,
    },
  })

  return user
}

// Check if user is admin
export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }
  return user
}
