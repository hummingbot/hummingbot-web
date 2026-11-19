"use client"

import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

/**
 * NextAuth's SessionProvider for every client component (useSession, signOut),
 * rendered ONCE, in the root layout. It gets no session, so pages stay static
 * and the client fetches it. Don't nest a second provider (e.g. one fed the
 * server session in a layout): NextAuth keeps its state in a module-level
 * global, so the inner one marks the session as loaded and the outer one never
 * fetches it — the header then showed "Sign in" on every page outside that
 * layout, as if signed out.
 */
export function AuthSessionProvider({
  session,
  children,
}: {
  session?: Session | null
  children: React.ReactNode
}): React.JSX.Element {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
