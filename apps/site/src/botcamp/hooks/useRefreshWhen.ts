"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * While `active` holds, re-fetch the page's server components: once shortly
 * after it turns true, then every `retryMs` until the server's answer flips
 * it back. Used when a race clock hits zero — the server moves the stage
 * (advanceDueHackathonStages), and the refresh brings the new stage in
 * without the viewer reloading. The retries cover a viewer clock running
 * slightly ahead of the server's.
 */
export function useRefreshWhen(active: boolean, { firstMs = 2_000, retryMs = 15_000 } = {}) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const first = setTimeout(() => router.refresh(), firstMs)
    const retry = setInterval(() => router.refresh(), retryMs)
    return () => {
      clearTimeout(first)
      clearInterval(retry)
    }
  }, [active, firstMs, retryMs, router])
}
