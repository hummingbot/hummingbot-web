import { describe, it, expect } from "vitest"
import { buildPageSuggestions, readPageSuggestions, withoutField } from "./agent-page-suggestions"
import { MAX_SUMMARY_LENGTH } from "./strategy-input"

const current = { title: "Grid Bot", summary: "Runs a grid.", details: null }
const now = new Date("2026-10-30T12:00:00Z")

describe("buildPageSuggestions", () => {
  it("keeps only the fields whose text changes", () => {
    const r = buildPageSuggestions(
      { title: "Grid Bot", summary: "Runs a BTC grid on Binance.", details: "", note: " Clearer " },
      current,
      "admin",
      now,
    )
    expect(r.suggestions).toEqual({
      fields: { summary: "Runs a BTC grid on Binance." },
      note: "Clearer",
      suggestedAt: now.toISOString(),
      suggestedById: "admin",
    })
  })

  it("answers null when nothing changes, so the admin can withdraw a suggestion", () => {
    expect(buildPageSuggestions({ title: "Grid Bot", summary: "Runs a grid." }, current, "admin").suggestions).toBeNull()
  })

  it("refuses an empty name, and text past the editor's limits", () => {
    expect(buildPageSuggestions({ title: "  " }, current, "admin").error).toMatch(/name/)
    expect(buildPageSuggestions({ summary: "x".repeat(MAX_SUMMARY_LENGTH + 1) }, current, "admin").error).toMatch(/Summary/)
  })
})

describe("readPageSuggestions / withoutField", () => {
  const stored = { fields: { title: "Grid", summary: "S" }, note: null, suggestedAt: "t", suggestedById: "a" }

  it("reads what was stored, and treats anything else as nothing pending", () => {
    expect(readPageSuggestions(stored)?.fields).toEqual({ title: "Grid", summary: "S" })
    expect(readPageSuggestions(null)).toBeNull()
    expect(readPageSuggestions({ fields: { evil: "x" } })).toBeNull()
  })

  it("clears the whole suggestion once its last field is handled", () => {
    const one = withoutField(readPageSuggestions(stored)!, "title")
    expect(one?.fields).toEqual({ summary: "S" })
    expect(withoutField(one!, "summary")).toBeNull()
  })
})
