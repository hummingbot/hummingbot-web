"use client"

import { useEffect, useRef, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

// The public page is framed at a typical desktop viewport, then scaled down
// to fit. Keep the height viewport-like: the hero is sized to 100svh, so a
// taller frame would stretch it. The frame scrolls to reach the rest.
const FRAME_WIDTH = 1440
const FRAME_HEIGHT = 900

// Hackathon pages that write real data (sign-up, applications) — blocked in
// the preview so clicking around never registers or applies the admin.
const WRITE_FLOW_SEGMENTS = ["register", "apply", "applications"]

interface StagePreviewProps {
  hackathonSlug: string
  stage: string
}

/**
 * Scaled-down live render of the public hackathon page as it would look in
 * `stage`, via the admin-only `?previewStage=` override. Scroll inside the
 * frame to see the whole page; "Open full preview" opens it in a new tab.
 *
 * Only links within this hackathon work in the frame — the rest of the site
 * (header, footer, external links) is blocked so the preview stays a preview.
 */
export function StagePreview({ hackathonSlug, stage }: StagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(0.4)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const basePath = `/hackathons/${hackathonSlug}`
  const src = `${basePath}?previewStage=${stage}`

  // Runs on every load of the frame (including after an allowed navigation).
  // Same-origin, so the frame's document is reachable.
  const guardLinks = () => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return

    const style = doc.createElement("style")
    style.textContent = [
      `a[href]:not([href^="${basePath}"]):not([href^="#"])`,
      ...WRITE_FLOW_SEGMENTS.map((segment) => `a[href*="${basePath}/"][href*="/${segment}"]`),
    ].join(", ") + " { cursor: not-allowed; }"
    doc.head.appendChild(style)

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]")
      if (!anchor) return
      const url = new URL(anchor.getAttribute("href") ?? "", doc.location.href)
      const isSameHackathon =
        url.origin === window.location.origin &&
        (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))
      const subPath = url.pathname.slice(basePath.length + 1).split("/")
      const isWriteFlow = subPath.some((segment) => WRITE_FLOW_SEGMENTS.includes(segment))
      // Capture phase + stopPropagation also stops Next's client-side router.
      if (!isSameHackathon || isWriteFlow || event.type === "auxclick") {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      // Back to the main page: keep showing the previewed stage.
      if (url.pathname === basePath && !url.searchParams.has("previewStage")) {
        event.preventDefault()
        event.stopPropagation()
        url.searchParams.set("previewStage", stage)
        doc.location.href = url.toString()
      }
    }
    doc.addEventListener("click", onClick, true)
    doc.addEventListener("auxclick", onClick, true)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / FRAME_WIDTH)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="space-y-bc-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Public page preview
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open full preview
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-bc-md border border-border bg-background"
        style={{ height: FRAME_HEIGHT * scale }}
      >
        {loadedSrc !== src && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          key={src}
          ref={iframeRef}
          src={src}
          title={`Hackathon page in the ${stage} stage`}
          onLoad={() => {
            setLoadedSrc(src)
            guardLinks()
          }}
          className="absolute left-0 top-0 origin-top-left border-0"
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  )
}
