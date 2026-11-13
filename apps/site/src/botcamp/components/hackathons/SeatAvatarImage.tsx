"use client"

import { useEffect, useRef, useState } from "react"
import { getAvatarGradient } from "@/botcamp/lib/avatar"

/**
 * A driver's avatar photo that falls back to their initial on a gradient
 * when the image fails to load, instead of a broken-image icon.
 */
export function SeatAvatarImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  // A photo that failed before hydration never fires onError, so check once
  // on mount too (Botcamp's perf branch gets there with loading="lazy").
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setFailed(true)
  }, [])
  if (failed) {
    return (
      <div
        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
        style={getAvatarGradient(name)}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0"
    />
  )
}
