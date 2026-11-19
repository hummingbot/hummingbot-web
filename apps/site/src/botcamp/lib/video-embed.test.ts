/**
 * Video links are user input that becomes an iframe src. The risk: a link
 * that frames another site, or one of our own URLs serving an uploaded SVG —
 * the 2026-10-29 probe framed /api/users/<id>/avatar by tucking
 * "youtube.com/embed/x" into the query string, which the old substring checks
 * passed through untouched.
 */

import { describe, it, expect } from "vitest"
import { parseLessonVideo, parseVideoUrl } from "./video-embed"

describe("parseVideoUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=4", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/123456", "https://player.vimeo.com/video/123456"],
    ["https://vimeo.com/123456/abcdef12", "https://player.vimeo.com/video/123456?h=abcdef12"],
    ["https://player.vimeo.com/video/123456?h=abcdef12", "https://player.vimeo.com/video/123456?h=abcdef12"],
    ["https://www.loom.com/share/0123456789abcdef0123456789abcdef?sid=x", "https://www.loom.com/embed/0123456789abcdef0123456789abcdef"],
    ["https://drive.google.com/file/d/1AbC-d_E/view?usp=sharing", "https://drive.google.com/file/d/1AbC-d_E/preview"],
    ["https://drive.google.com/open?id=1AbC-d_E", "https://drive.google.com/file/d/1AbC-d_E/preview"],
  ])("builds the provider embed for %s", (input, embedUrl) => {
    expect(parseVideoUrl(input)?.embedUrl).toBe(embedUrl)
  })

  it.each([
    // The probe's payloads: our own upload routes with a provider name in the query.
    "https://www.botcamp.xyz/api/users/cmvtob83m0003l807zhwhh6nr/avatar?z=1793288896&youtube.com/embed/x",
    "https://www.botcamp.xyz/api/strategies/xss17729-iframe-probe/images/cmvtq5e250001kw08d4wuhvai?z=1&youtube.com/embed/x",
    // Another host that merely mentions a provider.
    "https://evil.example/youtube.com/embed/dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://evil.example/?v=dQw4w9WgXcQ&loom.com/embed/abc",
    "https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ",
    // Not http(s), or not a URL.
    "javascript:alert(1)//youtube.com/embed/dQw4w9WgXcQ",
    "data:text/html,<script>alert(1)</script>",
    "www.youtube.com",
    // A provider host, but an ID that could steer the embed path.
    "https://www.youtube.com/embed/..%2F..%2Fx",
    "https://youtu.be/pending-abcmm-demo",
    "https://www.loom.com/share/abc/../../x",
  ])("refuses %s", (input) => {
    expect(parseVideoUrl(input)).toBeNull()
  })
})

describe("parseLessonVideo", () => {
  it.each([
    ["dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    // Bare digits are Vimeo, as the lesson editors read them (21 lessons on prod).
    ["1027456134", "https://player.vimeo.com/video/1027456134"],
    ["vimeo:123456", "https://player.vimeo.com/video/123456"],
    ["vimeo:123456/abcdef12", "https://player.vimeo.com/video/123456?h=abcdef12"],
    ["loom:0123456789abcdef", "https://www.loom.com/embed/0123456789abcdef"],
    ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
  ])("builds the embed for %s", (input, embedUrl) => {
    expect(parseLessonVideo(input)?.embedUrl).toBe(embedUrl)
  })

  it.each(["https://evil.example/", "youtube:../x", "other:abc", "not an id"])("refuses %s", (input) => {
    expect(parseLessonVideo(input)).toBeNull()
  })
})
