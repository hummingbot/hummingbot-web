"use client"

import { useEffect } from "react"

// Belt and braces for the read-only dashboard preview: Botcamp's client code
// sends its writes to /api/... with fetch. Those routes don't exist here and
// every button that would call one is disabled, but if one slips through, it
// is answered locally with a 403 and never leaves the browser.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function ReadOnlyFetchGuard(): null {
  useEffect(() => {
    const original = window.fetch
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
      if (WRITE_METHODS.has(method)) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Read-only preview: changes are disabled" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }),
        )
      }
      return original(input, init)
    }
    return () => {
      window.fetch = original
    }
  }, [])
  return null
}
