import { describe, expect, it } from "vitest"
import { strategyInputError } from "@/botcamp/lib/strategy-input"

describe("strategyInputError video link", () => {
  it("accepts YouTube links", () => {
    for (const videoURL of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ]) {
      expect(strategyInputError({ videoURL })).toBeNull()
    }
  })

  it("rejects every other host, including the ones lessons can embed", () => {
    for (const videoURL of [
      "https://vimeo.com/123456789",
      "https://www.loom.com/share/abc123",
      "https://drive.google.com/file/d/abc_123/view",
      "https://evil.example/?youtube.com/watch?v=dQw4w9WgXcQ",
    ]) {
      expect(strategyInputError({ videoURL })).toBe("Video link must be a YouTube video")
    }
  })

  it("lets a link saved before the rule through unchanged", () => {
    const stored = "https://vimeo.com/123456789"
    expect(strategyInputError({ videoURL: stored }, stored)).toBeNull()
  })

  it("lets the link be cleared", () => {
    expect(strategyInputError({ videoURL: "" })).toBeNull()
    expect(strategyInputError({ videoURL: null })).toBeNull()
  })
})
