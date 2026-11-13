"use client"

import { createContext, useContext } from "react"
import type { PreviewSession } from "@/botcamp/lib/preview-session"

// Client half of the read-only dashboard preview: stands in for next-auth's
// useSession() with the preview user the dashboard layout resolved.

export const READ_ONLY_TITLE = "Read-only preview"

const PreviewSessionContext = createContext<PreviewSession | null>(null)

export function PreviewSessionProvider({
  session,
  children,
}: {
  session: PreviewSession
  children: React.ReactNode
}) {
  return <PreviewSessionContext.Provider value={session}>{children}</PreviewSessionContext.Provider>
}

export function useSession(): {
  data: PreviewSession | null
  status: "authenticated" | "unauthenticated"
  update: () => Promise<PreviewSession | null>
} {
  const session = useContext(PreviewSessionContext)
  return {
    data: session,
    status: session ? "authenticated" : "unauthenticated",
    update: async () => session,
  }
}

/** Signing out isn't a thing here; the buttons that would call it are disabled. */
export async function signOut(_opts?: { redirect?: boolean; callbackUrl?: string }): Promise<void> {
  void _opts
}
