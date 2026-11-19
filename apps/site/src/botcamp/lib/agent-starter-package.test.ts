import { describe, it, expect } from "vitest"
import { validateAgentPackage } from "./agent-package"
import {
  STARTER_AGENT_DEFAULTS,
  STARTER_AGENT_DIR,
  buildStarterAgent,
  starterAgentFileRoles,
} from "./agent-starter-package"

const asPackage = (files: ReturnType<typeof buildStarterAgent>) =>
  files.map((f) => ({ path: f.path, content: Buffer.from(f.content) }))

describe("buildStarterAgent", () => {
  it("passes the strict structure check, its README in docs/", () => {
    const r = validateAgentPackage(asPackage(buildStarterAgent()))
    expect(r.ok ? [] : r.errors).toEqual([])
    if (!r.ok) return
    expect(r.manifest.name).toBe("Example PMM Agent")
    expect(r.manifest.loops).toEqual(["main"])
    expect(r.description).toMatch(/^Example agent/)
    expect(r.files.some((f) => f.path === "docs/README.md")).toBe(true)
    expect(r.tree.filter((e) => e.leftOut)).toEqual([])
    expect(r.warnings).toEqual([])
  })

  it("leaves server_name out by default, so the agent follows its owner's server", () => {
    const agentMd = buildStarterAgent().find((f) => f.path === `${STARTER_AGENT_DIR}/AGENT.md`)!
    expect(agentMd.content).not.toContain("server_name")
  })

  it("pins a server when one is given, and still passes the check", () => {
    const files = buildStarterAgent({ ...STARTER_AGENT_DEFAULTS, serverName: "race-1" })
    expect(files.find((f) => f.path.endsWith("/AGENT.md"))!.content).toContain("server_name: race-1")
    expect(validateAgentPackage(asPackage(files)).ok).toBe(true)
  })

  it("documents every file it ships", () => {
    const shipped = buildStarterAgent()
      .map((f) => f.path.slice(STARTER_AGENT_DIR.length + 1))
      .filter((p) => p !== "README.md")
    const documented = starterAgentFileRoles(STARTER_AGENT_DEFAULTS).map((r) => r.path)
    for (const path of shipped) expect(documented).toContain(path)
  })
})
