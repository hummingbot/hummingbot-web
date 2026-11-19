import { describe, it, expect } from "vitest"
import { venueOfConnector, venuesInPackage } from "./agent-package-venues"
import { buildStarterAgent } from "./agent-starter-package"

const f = (path: string, content: string) => ({ path, content: Buffer.from(content) })

describe("venueOfConnector", () => {
  it("reduces a Hummingbot connector to its venue", () => {
    expect(venueOfConnector("gate_io_perpetual")).toBe("gate")
    expect(venueOfConnector("binance_perpetual")).toBe("binance")
    expect(venueOfConnector("meteora/clmm")).toBe("meteora")
    expect(venueOfConnector("XRPL")).toBe("xrpl")
    expect(venueOfConnector("hyperliquid_perpetual_testnet")).toBe("hyperliquid")
  })
})

describe("venuesInPackage", () => {
  it("reads sample configs and loop default_configs, once per venue", () => {
    const venues = venuesInPackage([
      f("controllers/mm/sample_configs/a.yml", "connector_name: gate_io_perpetual\n"),
      f("controllers/mm/sample_configs/b.yml", "connector_name: gate_io\n"),
      f("loops/main/loop.md", "---\ndefault_config:\n  connectors: [meteora/clmm, binance]\n---\nRun.\n"),
      f("AGENT.md", "---\nname: x\n---\nconnector_name: ignored\n"),
    ])
    expect(venues).toEqual(["gate", "meteora", "binance"])
  })

  it("reads configs Condor leaves out, like a race entry's conf/, under any folder", () => {
    expect(
      venuesInPackage([
        f("quad/conf/conf_e4_quad_btc.yml", "connector_name: bitget_perpetual\n"),
        f("quad/loops/main/loop.md", "---\ndefault_config:\n  connector_name: gate_io\n---\n"),
      ]),
    ).toEqual(["bitget", "gate"])
  })

  it("skips files it can't parse instead of failing", () => {
    expect(venuesInPackage([f("controllers/mm/sample_configs/a.yml", "connector_name: [unclosed\n")])).toEqual([])
  })

  it("finds the starter agent's venue", () => {
    const files = buildStarterAgent().map((file) => ({
      path: file.path.replace(/^example_pmm_agent\//, ""),
      content: Buffer.from(file.content),
    }))
    expect(venuesInPackage(files)).toEqual(["binance"])
  })

  // A few hundred bytes of nested aliases expand to ~6×10^13 values when walked
  // (security review of #110): it must be skipped, not walked.
  it("skips a config built from YAML aliases instead of walking it", () => {
    const levels = ["l0: &l0 [" + Array(200).fill("x").join(",") + "]"]
    for (let i = 1; i <= 6; i++) levels.push(`l${i}: &l${i} [` + Array(200).fill(`*l${i - 1}`).join(",") + "]")
    const bomb = levels.join("\n") + "\nconnector_name: binance\n"
    const started = Date.now()
    expect(venuesInPackage([f("controllers/mm/sample_configs/a.yml", bomb)])).toEqual([])
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it("still reads the venue from configs alongside one it skipped", () => {
    expect(
      venuesInPackage([
        f("controllers/mm/sample_configs/a.yml", "base: &b {x: 1}\nother: *b\n"),
        f("controllers/mm/sample_configs/b.yml", "connector_name: kucoin\n"),
      ]),
    ).toEqual(["kucoin"])
  })
})
