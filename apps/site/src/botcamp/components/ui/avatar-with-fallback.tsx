"use client"

import { cn } from "@/botcamp/lib/utils"
import { getAvatarGradient, getInitials } from "@/botcamp/lib/avatar"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

interface AvatarWithFallbackProps {
  name: string
  src?: string | null
  alt?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  className?: string
  showBorder?: boolean
}

const sizeStyles = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-24 w-24 text-2xl",
}

const imageSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  "2xl": 96,
}

/**
 * AvatarWithFallback - An avatar component with gradient fallback
 *
 * @example
 * // With image
 * <AvatarWithFallback
 *   name="John Doe"
 *   src="/api/users/123/avatar"
 *   size="lg"
 * />
 *
 * @example
 * // Without image (gradient fallback)
 * <AvatarWithFallback name="John Doe" size="md" />
 */
export function AvatarWithFallback({
  name,
  src,
  alt,
  size = "md",
  className,
  showBorder = false,
}: AvatarWithFallbackProps) {
  const [imageError, setImageError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  // A photo that failed before hydration never fires onError; check on mount.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setImageError(true)
  }, [])
  const initials = getInitials(name)
  const gradient = getAvatarGradient(name)
  const showFallback = !src || imageError

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0",
        sizeStyles[size],
        showBorder && "ring-2 ring-background",
        className
      )}
      style={showFallback ? gradient : undefined}
    >
      {showFallback ? (
        <span className="font-semibold text-white">{initials}</span>
      ) : (
        <Image
          src={src}
          alt={alt || name}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-cover w-full h-full"
          onError={() => setImageError(true)}
          ref={imgRef}
          // Remote avatars skip the optimizer: this site configures no image hosts.
          unoptimized={!src!.startsWith("/")}
        />
      )}
    </div>
  )
}

/**
 * AvatarGroup - Display a group of overlapping avatars
 */
export function AvatarGroup({
  items,
  max = 4,
  size = "sm",
  className,
}: {
  items: Array<{ name: string; src?: string | null }>
  max?: number
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}) {
  const displayedItems = items.slice(0, max)
  const remainingCount = items.length - max

  return (
    <div className={cn("flex -space-x-2", className)}>
      {displayedItems.map((item, index) => (
        <AvatarWithFallback
          key={index}
          name={item.name}
          src={item.src}
          size={size}
          showBorder
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full bg-muted ring-2 ring-background",
            sizeStyles[size]
          )}
        >
          <span className="text-muted-foreground font-medium">
            +{remainingCount}
          </span>
        </div>
      )}
    </div>
  )
}
