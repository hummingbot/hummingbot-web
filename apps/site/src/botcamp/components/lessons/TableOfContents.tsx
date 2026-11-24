"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import type { TocItem } from "@/botcamp/lib/markdown-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/botcamp/components/ui/popover"

interface TableOfContentsProps {
  items: TocItem[]
  className?: string
}

/** Tracks which heading is currently in view and provides a smooth-scroll
 * click handler — shared between the desktop sidebar list and the mobile
 * dropdown so both stay in sync with the same active section. */
function useActiveHeading(items: TocItem[]) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: "-80px 0px -80% 0px",
        threshold: 0,
      }
    )

    // Observe all heading elements
    items.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [items])

  const scrollToId = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      // Use scrollIntoView which works with nested scrollable containers
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      setActiveId(id)
    }
  }

  return { activeId, scrollToId }
}

export default function TableOfContents({ items, className }: TableOfContentsProps) {
  const { activeId, scrollToId } = useActiveHeading(items)

  if (items.length === 0) {
    return null
  }

  return (
    <nav className={cn("space-y-2", className)}>
      <h4 className="text-sm font-semibold text-foreground mb-4">On this page</h4>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                scrollToId(item.id)
              }}
              className={cn(
                "block py-1 transition-colors hover:text-foreground",
                item.level === 3 && "pl-4",
                activeId === item.id
                  ? "text-primary font-medium border-l-2 border-primary pl-3"
                  : "text-muted-foreground border-l-2 border-transparent pl-3"
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Mobile equivalent of the sidebar TOC — a full-width dropdown showing the
 * current section, so the "on this page" guide isn't lost below `lg` where
 * the sticky sidebar has no room. Meant to sit at the top of the content,
 * above the first section.
 */
export function MobileTableOfContents({ items, className }: TableOfContentsProps) {
  const { activeId, scrollToId } = useActiveHeading(items)
  const [open, setOpen] = useState(false)

  if (items.length === 0) {
    return null
  }

  const activeItem = items.find((item) => item.id === activeId)

  // Botcamp uses a Radix DropdownMenu here; this site has no dropdown-menu
  // primitive, so the same list sits in a Popover.
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-bc-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium",
            className
          )}
        >
          <span className="text-muted-foreground">
            On this page
            {activeItem && <span className="text-foreground"> — {activeItem.text}</span>}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] max-w-md p-1"
        // Radix refocuses the trigger on close, and the browser scrolls
        // focused elements into view — that fights the scrollIntoView below
        // and snaps the page back to the trigger. Suppress it.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setOpen(false)
              scrollToId(item.id)
            }}
            className={cn(
              "block w-full rounded-bc-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
              item.level === 3 && "pl-6",
              activeId === item.id && "text-primary font-medium"
            )}
          >
            {item.text}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
