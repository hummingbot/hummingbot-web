import { NextResponse } from "next/server"

export type ImageMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml"

export const RASTER_IMAGE_TYPES: readonly ImageMimeType[] = ["image/png", "image/jpeg", "image/webp"]
export const IMAGE_TYPES_WITH_SVG: readonly ImageMimeType[] = [...RASTER_IMAGE_TYPES, "image/svg+xml"]

const TYPE_LABELS: Record<ImageMimeType, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "image/svg+xml": "SVG",
}

// An SVG may open with a BOM, an XML declaration, comments and a doctype.
const SVG_START = /^﻿?\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s/>]/i

/** The image type the bytes actually are — never the type the client claimed. */
export function sniffImageType(data: Buffer): ImageMimeType | null {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png"
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg"
  if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp"
  }
  if (SVG_START.test(data.subarray(0, 4096).toString("utf8"))) return "image/svg+xml"
  return null
}

// What a diagram never needs and a payload always does. The sandboxing CSP
// these images are served with (next.config.mjs) is what actually stops
// script; this turns the obvious attempts away at upload with a clear message.
const SVG_ACTIVE_CONTENT = /<script|<iframe|<embed|<object|[\s/]on[a-z]+\s*=|javascript:/i

/**
 * Reads an uploaded image, checking its size and its real type (from the
 * bytes). Returns the bytes and the sniffed MIME type to store, or the reason
 * it was refused.
 */
export async function readImageUpload(
  file: File,
  allowed: readonly ImageMimeType[],
  maxBytes: number,
): Promise<{ data: Buffer; mimeType: ImageMimeType } | { error: string }> {
  const allowedLabel = allowed.map((type) => TYPE_LABELS[type]).join(", ")
  if (file.size > maxBytes) {
    return { error: `Image must be ${Math.round(maxBytes / (1024 * 1024))}MB or smaller` }
  }
  const data = Buffer.from(await file.arrayBuffer())
  const mimeType = sniffImageType(data)
  if (!mimeType || !allowed.includes(mimeType)) {
    return { error: `Image must be ${allowedLabel}` }
  }
  if (mimeType === "image/svg+xml" && SVG_ACTIVE_CONTENT.test(data.toString("utf8"))) {
    return { error: "SVG images can't contain scripts, event handlers or embedded frames" }
  }
  return { data, mimeType }
}

// Short on purpose: Vercel's CDN honours this, and on 2026-10-29 it kept
// serving two deleted script-carrying avatars from cache (max-age was a day)
// until the cache was purged by hand. Removing an image should take effect
// within minutes.
const UPLOADED_IMAGE_CACHE_CONTROL = "public, max-age=300"

// For an image only some viewers may see (a paywalled or racing strategy's
// resources). "public" let the CDN keep the copy a member fetched and hand
// it to anyone asking the same URL for five minutes, access check skipped.
const GATED_IMAGE_CACHE_CONTROL = "private, no-store"

/**
 * Serves stored image bytes. A stored type that isn't one of ours (rows from
 * before uploads were sniffed) is sent as a download, never rendered. Pass
 * `gated` when the route checked who may see it, so no shared cache keeps it.
 *
 * The sandboxing Content-Security-Policy these routes need is set in
 * next.config.mjs, not here: Next applies its config headers over a route's.
 */
export function uploadedImageResponse(
  data: Uint8Array,
  mimeType: string,
  { gated = false }: { gated?: boolean } = {},
): NextResponse {
  const isImage = (IMAGE_TYPES_WITH_SVG as readonly string[]).includes(mimeType)
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": isImage ? mimeType : "application/octet-stream",
      ...(isImage ? {} : { "Content-Disposition": "attachment" }),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": gated ? GATED_IMAGE_CACHE_CONTROL : UPLOADED_IMAGE_CACHE_CONTROL,
    },
  })
}
