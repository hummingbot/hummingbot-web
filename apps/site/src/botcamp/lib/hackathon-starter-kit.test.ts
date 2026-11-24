import { describe, it, expect } from "vitest"
import {
  DEFAULT_STARTER_KIT,
  buildConfigSnippet,
  parseRaceHosts,
  parseStarterKit,
  renderBotName,
  resolveStarterKit,
} from "./hackathon-starter-kit"

describe("parseStarterKit", () => {
  it("accepts the default kit as-is", () => {
    expect(parseStarterKit(DEFAULT_STARTER_KIT)).toEqual({ kit: DEFAULT_STARTER_KIT })
  })

  it("trims, dedupes, and upper-cases pairs", () => {
    const parsed = parseStarterKit({
      ...DEFAULT_STARTER_KIT,
      approvedModels: [" openrouter:x ", "openrouter:x", ""],
      markets: [{ venue: " Gate ", connectors: ["gate_io_perpetual"], pairs: ["btc-usdt", "BTC-USDT"] }],
    })
    expect(parsed).toMatchObject({
      kit: {
        approvedModels: ["openrouter:x"],
        markets: [{ venue: "Gate", connectors: ["gate_io_perpetual"], pairs: ["BTC-USDT"] }],
      },
    })
  })

  it("falls back to the race defaults for position mode and shutdown policy", () => {
    // Kits saved before position mode and shutdown policy existed, or with a
    // value Condor doesn't know, fall back to the race defaults.
    const older: Record<string, unknown> = { ...DEFAULT_STARTER_KIT }
    delete older.positionMode
    delete older.shutdownPolicy
    expect(parseStarterKit(older)).toMatchObject({ kit: { positionMode: "HEDGE", shutdownPolicy: "flatten_all" } })
    expect(parseStarterKit({ ...DEFAULT_STARTER_KIT, positionMode: "hedge", shutdownPolicy: "close_all" })).toMatchObject({
      kit: { positionMode: "HEDGE", shutdownPolicy: "flatten_all" },
    })
    expect(parseStarterKit({ ...DEFAULT_STARTER_KIT, positionMode: "ONEWAY", shutdownPolicy: "keep_all" })).toMatchObject({
      kit: { positionMode: "ONEWAY", shutdownPolicy: "keep_all" },
    })
  })

  it("falls back to the default bot name pattern when blank", () => {
    expect(parseStarterKit({ ...DEFAULT_STARTER_KIT, botNamePattern: "  " })).toMatchObject({
      kit: { botNamePattern: "{team}-{agent}" },
    })
  })

  it("rejects a market without connectors, and a non-http support link", () => {
    expect(parseStarterKit({ ...DEFAULT_STARTER_KIT, markets: [{ venue: "Gate", connectors: [] }] })).toHaveProperty(
      "error",
    )
    expect(parseStarterKit({ ...DEFAULT_STARTER_KIT, supportUrl: "javascript:alert(1)" })).toHaveProperty("error")
    expect(parseStarterKit([])).toHaveProperty("error")
  })
})

describe("resolveStarterKit", () => {
  it("uses the default until the hackathon has its own kit", () => {
    expect(resolveStarterKit(null)).toEqual({ kit: DEFAULT_STARTER_KIT, isDefault: true })
    expect(resolveStarterKit({ markets: "broken" })).toEqual({ kit: DEFAULT_STARTER_KIT, isDefault: true })
    const own = { ...DEFAULT_STARTER_KIT, llmProvider: "OpenRouter" }
    expect(resolveStarterKit(own)).toEqual({ kit: own, isDefault: false })
  })
})

describe("parseRaceHosts", () => {
  it("keeps named hosts", () => {
    expect(parseRaceHosts([{ name: " race-1 ", address: "10.0.0.1" }])).toEqual({
      hosts: [{ name: "race-1", address: "10.0.0.1", note: "" }],
    })
  })

  it("rejects blank, `local`, and duplicate names", () => {
    expect(parseRaceHosts([{ name: "" }])).toHaveProperty("error")
    expect(parseRaceHosts([{ name: "Local" }])).toHaveProperty("error")
    expect(parseRaceHosts([{ name: "a" }, { name: "a" }])).toHaveProperty("error")
    expect(parseRaceHosts("a")).toHaveProperty("error")
  })
})

describe("renderBotName", () => {
  it("fills team and agent", () => {
    expect(renderBotName("{team}-{agent}", { team: "gate", agent: "aegis" })).toBe("gate-aegis")
  })
})

describe("buildConfigSnippet", () => {
  it("pins the kit's model, host, bot name, and capital", () => {
    const kit = { ...DEFAULT_STARTER_KIT, approvedModels: ["openrouter:deepseek/deepseek-v4.1-flash"] }
    const snippet = buildConfigSnippet(kit, { startingCapital: 800, serverName: "race-1", team: "gate", agent: "aegis" })
    expect(snippet).toContain("agent_key: openrouter:deepseek/deepseek-v4.1-flash")
    expect(snippet).toContain("server_name: race-1")
    expect(snippet).toContain("bot_name: gate-aegis")
    expect(snippet).toContain("total_amount_quote: 800")
  })

  it("leaves placeholders for what the kit doesn't know", () => {
    const snippet = buildConfigSnippet(DEFAULT_STARTER_KIT, { startingCapital: 800 })
    expect(snippet).toContain("agent_key: <an approved model>")
    expect(snippet).toContain("server_name: <your assigned host>")
  })
})
