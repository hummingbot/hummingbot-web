"use client"

import { useState } from "react"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import { cn } from "@/botcamp/lib/utils"

/**
 * Avatar that degrades gracefully: renders the image when it loads, and
 * falls back to a gradient monogram if there's no URL or the image fails
 * (common with OAuth photo URLs — Google/GitHub can 403 hotlinked
 * requests). `referrerPolicy="no-referrer"` avoids most of those 403s.
 */
export function BuilderAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string
  avatarUrl: string | null
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full border border-border object-cover", className)}
      />
    )
  }

  return (
    <span
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-border font-bold text-black",
        className,
      )}
      style={getAvatarGradient(name)}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
