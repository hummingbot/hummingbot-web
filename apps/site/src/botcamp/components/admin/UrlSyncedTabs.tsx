"use client"

import { usePathname, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import { Tabs } from "@/botcamp/components/ui/tabs"

interface UrlSyncedTabsProps {
  defaultValue: string
  paramName?: string
  children: ReactNode
}

/**
 * Tabs that keep the active tab in the URL (?tab=...) so a refresh reopens
 * the same one, without paying for a server round-trip on every tab click.
 * Uses history.replaceState directly instead of next/navigation's router —
 * router.replace would re-render the Server Component on every switch, since
 * App Router treats a searchParams change as needing a fresh render.
 */
export function UrlSyncedTabs({ defaultValue, paramName = "tab", children }: UrlSyncedTabsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleValueChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, value)
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`)
  }

  return (
    <Tabs defaultValue={defaultValue} onValueChange={handleValueChange}>
      {children}
    </Tabs>
  )
}
