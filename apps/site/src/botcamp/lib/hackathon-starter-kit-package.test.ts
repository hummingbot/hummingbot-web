import yaml from "js-yaml"
import { describe, it, expect } from "vitest"
import { validateAgentPackage } from "./agent-package"
import { DEFAULT_STARTER_KIT } from "./hackathon-starter-kit"
import { STARTER_AGENT_DIR, buildStarterPackage } from "./hackathon-starter-kit-package"

const opts = { hackathonTitle: "Agent Builders Cup 3", startingCapital: 800 }
const file = (files: ReturnType<typeof buildStarterPackage>, path: string) =>
  files.find((f) => f.path === `${STARTER_AGENT_DIR}/${path}`)?.content ?? ""

describe("buildStarterPackage", () => {
  it("ships a complete example agent in the layout Condor installs", () => {
    expect(buildStarterPackage(DEFAULT_STARTER_KIT, opts).map((f) => f.path)).toEqual([
      "example_pmm_agent/docs/README.md",
      "example_pmm_agent/AGENT.md",
      "example_pmm_agent/shutdown.md",
      "example_pmm_agent/loops/main/loop.md",
      "example_pmm_agent/skills/pmm_operator/SKILL.md",
      "example_pmm_agent/controllers/example_pmm/example_pmm.py",
      "example_pmm_agent/controllers/example_pmm/CONTROLLER.md",
      "example_pmm_agent/controllers/example_pmm/sample_configs/race.yml",
    ])
  })

  it("wires the pieces together: skill, conf, and controller", () => {
    const files = buildStarterPackage(DEFAULT_STARTER_KIT, opts)
    expect(file(files, "loops/main/loop.md")).toContain("skills: [pmm_operator]")
    expect(file(files, "controllers/example_pmm/sample_configs/race.yml")).toContain("controller_name: example_pmm")
    expect(file(files, "controllers/example_pmm/sample_configs/race.yml")).toContain("controller_type: market_making")
    expect(file(files, "controllers/example_pmm/CONTROLLER.md")).toContain("type: market_making")
    expect(file(files, "controllers/example_pmm/example_pmm.py")).toContain('controller_name: str = "example_pmm"')
    expect(file(files, "skills/pmm_operator/SKILL.md")).toContain('controllers_config=["example_pmm__race"]')
  })

  it("writes the controller config the way Condor's pmm samples do", () => {
    const race = yaml.load(file(buildStarterPackage(DEFAULT_STARTER_KIT, opts), "controllers/example_pmm/sample_configs/race.yml"))
    // ONEWAY nets fills against each other and breaks the barrier bookkeeping.
    expect(race).toMatchObject({ position_mode: "HEDGE", buy_spreads: [0.002], sell_spreads: [0.002] })
    expect(race).not.toHaveProperty("id")
  })

  it("pins the kit's position mode and shutdown policy", () => {
    const files = buildStarterPackage({ ...DEFAULT_STARTER_KIT, positionMode: "ONEWAY", shutdownPolicy: "keep_spot_close_perp" }, opts)
    expect(file(files, "controllers/example_pmm/sample_configs/race.yml")).toContain("position_mode: ONEWAY")
    expect(file(files, "shutdown.md")).toMatch(/^---\non_kill_switch: keep_spot_close_perp/)
    expect(file(files, "docs/README.md")).toContain("on_kill_switch: keep_spot_close_perp")
  })

  it("pins the kit's model, connector, pair, and capital", () => {
    const kit = {
      ...DEFAULT_STARTER_KIT,
      approvedModels: ["openrouter:deepseek/deepseek-v4.1-flash"],
      markets: [{ venue: "Gate", connectors: ["gate_io_perpetual"], pairs: ["BTC-USDT"] }],
    }
    const files = buildStarterPackage(kit, opts)
    expect(file(files, "AGENT.md")).toContain("agent_key: openrouter:deepseek/deepseek-v4.1-flash")
    expect(file(files, "loops/main/loop.md")).toContain("agent_key: openrouter:deepseek/deepseek-v4.1-flash")
    expect(file(files, "loops/main/loop.md")).toContain("total_amount_quote: 800")
    expect(file(files, "controllers/example_pmm/sample_configs/race.yml")).toContain("connector_name: gate_io_perpetual")
    expect(file(files, "controllers/example_pmm/sample_configs/race.yml")).toContain("total_amount_quote: 800")
  })

  it("keeps placeholders for a public download, and an example pair when any pair is allowed", () => {
    const files = buildStarterPackage(DEFAULT_STARTER_KIT, opts)
    expect(file(files, "controllers/example_pmm/sample_configs/race.yml")).toContain("trading_pair: BTC-USDT")
    expect(file(files, "AGENT.md")).toContain("server_name: <your assigned host>")
    expect(file(files, "loops/main/loop.md")).toContain("bot_name: <team-slug>-<agent-slug>")
    expect(file(files, "docs/README.md")).toContain("# Agent Builders Cup 3 — Starter Kit")
  })

  it("fills a seated builder's host, team, and agent", () => {
    const files = buildStarterPackage(DEFAULT_STARTER_KIT, { ...opts, serverName: "race-1", team: "gate", agent: "aegis" })
    expect(file(files, "AGENT.md")).toContain("server_name: race-1")
    expect(file(files, "loops/main/loop.md")).toContain("bot_name: gate-aegis")
  })

  // The registry refuses any file outside the agent structure, so the
  // example must pass whole: no errors, no warnings.
  it("passes the agent registry's structure check untouched", () => {
    for (const extra of [{}, { serverName: "race-1", team: "gate", agent: "aegis" }]) {
      const files = buildStarterPackage(DEFAULT_STARTER_KIT, { ...opts, ...extra })
      const result = validateAgentPackage(files.map((f) => ({ path: f.path, content: Buffer.from(f.content) })))
      expect(result.ok).toBe(true)
      expect(result.warnings).toEqual([])
      if (result.ok) expect(result.files).toHaveLength(files.length)
    }
  })
})
