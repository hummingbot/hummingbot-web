import JSZip from "jszip"
import { describe, it, expect } from "vitest"
import {
  AgentPackageReadError,
  buildAgentArchive,
  readAgentZip,
  structureIssue,
  validateAgentPackage,
  type AgentPackageFile,
} from "./agent-package"

const AGENT_MD = `---
name: Grid Bot
agent_key: claude-acp:sonnet
tools:
- get_prices
- create_grid_executor
---

# Grid Bot
`

const LOOP_MD = `---
default_config:
  total_amount_quote: 800
  server_name: abc-1
---
Run the grid.
`

const f = (path: string, content: string, extra: Partial<AgentPackageFile> = {}): AgentPackageFile => ({
  path,
  content: Buffer.from(content),
  ...extra,
})

const valid = () => [
  f("AGENT.md", AGENT_MD),
  f("loops/btc_grid/loop.md", LOOP_MD),
  f("routines/check.py", "print('ok')\n"),
]

const messages = (r: ReturnType<typeof validateAgentPackage>) =>
  r.ok ? [] : r.errors.map((e) => `${e.path ?? ""}: ${e.message}`)

describe("validateAgentPackage", () => {
  it("accepts a well-formed package and reads its manifest", () => {
    const r = validateAgentPackage(valid())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.manifest).toEqual({
      name: "Grid Bot",
      agentKey: "claude-acp:sonnet",
      tools: ["get_prices", "create_grid_executor"],
      loops: ["btc_grid"],
    })
    expect(r.warnings).toEqual([])
  })

  it("lists every file under the root", () => {
    const r = validateAgentPackage([...valid(), f("docs/notes.md", "# notes\n")])
    expect(r.ok).toBe(true)
    expect(r.tree.map((e) => e.path)).toEqual(["AGENT.md", "docs/notes.md", "loops/btc_grid/loop.md", "routines/check.py"])
  })

  it("keeps the tree when the package fails, so each error can be shown on its file", () => {
    const r = validateAgentPackage([...valid(), f("skills/bad/SKILL.md", "# bad\n"), f("skills/bad/data.csv", "a,b\n")])
    expect(r.ok).toBe(false)
    expect(r.tree.map((e) => e.path)).toContain("skills/bad/data.csv")
    expect(messages(r)).toContainEqual(expect.stringContaining("skills/bad/data.csv: A skill folder only takes markdown files"))
  })

  it("reads the AGENT.md description, if there is one", () => {
    const described = validateAgentPackage([
      f("AGENT.md", AGENT_MD.replace("name: Grid Bot", "name: Grid Bot\ndescription: Runs a BTC grid")),
      ...valid().slice(1),
    ])
    expect(described.ok && described.description).toBe("Runs a BTC grid")
    const plain = validateAgentPackage(valid())
    expect(plain.ok && plain.description).toBeNull()
  })

  it("roots the package at the AGENT.md folder, as in a repo with agents/<slug>/", () => {
    const r = validateAgentPackage([
      f("README.md", "repo readme"),
      ...valid().map((file) => ({ ...file, path: `agents/grid_bot/${file.path}` })),
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.files.map((x) => x.path)).toContain("AGENT.md")
    expect(r.warnings[0].message).toMatch(/1 file\(s\) outside/)
  })

  it("rejects a repo holding two agents side by side", () => {
    const r = validateAgentPackage([f("a/AGENT.md", AGENT_MD), f("b/AGENT.md", AGENT_MD)])
    expect(messages(r).join()).toMatch(/2 AGENT.md files/)
  })

  it("requires AGENT.md with a name in its frontmatter", () => {
    expect(messages(validateAgentPackage([f("loop.md", LOOP_MD)]))).toEqual([": No AGENT.md found"])
    expect(messages(validateAgentPackage([f("AGENT.md", "# no frontmatter")])).join()).toMatch(/Missing YAML frontmatter/)
    expect(messages(validateAgentPackage([f("AGENT.md", "---\ntools: []\n---\n")])).join()).toMatch(/`name` is required/)
  })

  it("only warns when agent_key or a loop's default_config is missing", () => {
    const r = validateAgentPackage([f("AGENT.md", "---\nname: X\n---\n"), f("loops/a/loop.md", "no frontmatter")])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.warnings.map((w) => w.message).join()).toMatch(/agent_key[\s\S]*default_config/)
  })

  it("rejects unsafe paths, symlinks, binaries, and secrets", () => {
    const r = validateAgentPackage([
      ...valid(),
      f("../escape.py", "x"),
      f("routines/link.py", "/etc/passwd", { isSymlink: true }),
      f("routines/model.bin", "x"),
      f(".env", "API_KEY=1"),
      f("conf/wallet.yml", "key: |\n  -----BEGIN EC PRIVATE KEY-----\n  MHcCAQEEIBkg4LVWM9nuwNSk3yByxZpYRTBnVJk5oBKMn0Rw1nUWoAoGCCqGSM49\n"),
    ])
    const all = messages(r).join("\n")
    expect(all).toMatch(/\.\.\/escape\.py: Unsafe path/)
    expect(all).toMatch(/link\.py: Symlinks/)
    expect(all).toMatch(/model\.bin: routines\/ only takes \.py files/)
    expect(all).toMatch(/\.env: Looks like a secrets file/)
    expect(all).toMatch(/wallet\.yml: Contains a private key/)
  })

  it("rejects YAML that doesn't parse", () => {
    const r = validateAgentPackage([...valid(), f("controllers/c/c.py", "x = 1\n"), f("controllers/c/sample_configs/bad.yml", "a: [1,")])
    expect(messages(r).join()).toMatch(/bad\.yml: Invalid YAML/)
  })

  it("drops build debris instead of failing on it", () => {
    const r = validateAgentPackage([
      ...valid(),
      f("routines/__pycache__/check.cpython-312.pyc", "\0"),
      f(".DS_Store", "\0"),
      f(".gitignore", "*.pyc"),
    ])
    expect(r.ok).toBe(true)
  })

  it("doesn't mistake a redaction test's dummy PEM header for a key", () => {
    const fixture = 'pem = "key -----BEGIN PRIVATE KEY-----\\nprivate-block-secret\\n-----END PRIVATE KEY-----"\n'
    expect(validateAgentPackage([...valid(), f("routines/redact.py", fixture)]).ok).toBe(true)
    const real = 'pem = "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\\n"\n'
    expect(messages(validateAgentPackage([...valid(), f("routines/k.py", real)])).join()).toMatch(/Contains a private key/)
  })

  it("calls a real env file a secret, and an env template just not part of an agent", () => {
    expect(messages(validateAgentPackage([...valid(), f(".env.local", "API_KEY=1")])).join()).toMatch(/Looks like a secrets file/)
    expect(messages(validateAgentPackage([...valid(), f(".env.example", "API_KEY=")])).join()).toMatch(/\.env\.example: Not part of an agent/)
  })

  it("rejects pickles, which run code when loaded", () => {
    expect(messages(validateAgentPackage([...valid(), f("routines/model.pkl", "x")])).join()).toMatch(/model\.pkl: routines\/ only takes \.py files/)
  })
})

describe("the agent structure (agents/market_making_expert is the reference)", () => {
  it("accepts exactly the reference layout", () => {
    for (const path of [
      "AGENT.md", "shutdown.md", "reflect.md", "core_rules.md",
      "loops/pmm_mister_operator/loop.md", "loops/pmm_mister_operator/shutdown.md",
      "skills/pmm_config_playbook/SKILL.md", "skills/pmm_config_playbook/config_aggressive.md",
      "routines/market_analyzer.py",
      "controllers/pmm_mister/pmm_mister.py", "controllers/pmm_mister/CONTROLLER.md",
      "controllers/pmm_mister/sample_configs/balanced.yml", "controllers/pmm_mister/sample_configs/spot.yaml",
      "docs/README.md", "docs/guides/tuning.md",
    ]) {
      expect(structureIssue(path), path).toBeNull()
    }
  })

  it("refuses everything else", () => {
    for (const path of [
      "PROFILE.yml", "README.md", "requirements.txt", ".env.example", "ORGANIZER_CAPITAL.md",
      "conf/pmm.yml", "server/app.py", "tests/t.py", "scripts/x.sh",
      "loops/a/config.yml", "loops/a/learnings.md", "loops/a/sessions/s1/status.json", "loops/loop.md",
      "skills/s/data.json", "skills/s/sub/more.md", "skills/SKILL.md",
      "routines/helpers/x.py", "routines/notes.md",
      "controllers/x.py", "controllers/market_making/pmm.py", "controllers/x/other.py",
      "controllers/x/utils/levels.py", "controllers/x/sample_configs/a.json", "controllers/x/conf/a.yml",
      "controllers/x/sample_configs/config.yml", "controllers/x/sample_configs/config.yaml",
      "docs/diagram.png",
    ]) {
      expect(structureIssue(path), path).not.toBeNull()
    }
  })

  it("refuses the upload, naming every file to remove", () => {
    const r = validateAgentPackage([
      ...valid(),
      f("PROFILE.yml", "a: 1\n"),
      f("loops/btc_grid/learnings.md", "- spreads widen at the US open\n"),
      f("tests/test_pure.py", "def test_x(): ...\n"),
    ])
    expect(r.ok).toBe(false)
    expect(messages(r)).toEqual([
      ": 3 file(s) aren't part of the agent structure — remove them and upload again: " +
        "PROFILE.yml, loops/btc_grid/learnings.md, tests/test_pure.py",
      expect.stringMatching(/^PROFILE\.yml: Not part of an agent — the top level only takes AGENT\.md/),
      "loops/btc_grid/learnings.md: A loop folder only takes loop.md and shutdown.md",
      expect.stringMatching(/^tests\/test_pure\.py: Folder tests\/ isn't part of an agent/),
    ])
  })

  it("tells where a Hummingbot-layout controller goes", () => {
    const r = validateAgentPackage([...valid(), f("controllers/market_making/pmm_quad.py", "class X: ...\n")])
    expect(messages(r)).toContain(
      "controllers/market_making/pmm_quad.py: Hummingbot layout, which Condor doesn't load — move it to " +
        "controllers/pmm_quad/pmm_quad.py, with a CONTROLLER.md saying `type: market_making` and its configs " +
        "in controllers/pmm_quad/sample_configs/",
    )
  })

  it("asks to rename a sample named config, which Condor drops", () => {
    const r = validateAgentPackage([
      ...valid(),
      f("controllers/pmm/pmm.py", "class X: ...\n"),
      f("controllers/pmm/sample_configs/config.yml", "controller_name: pmm\n"),
    ])
    expect(messages(r)).toContain(
      "controllers/pmm/sample_configs/config.yml: Condor drops a sample named `config` — rename it (e.g. balanced.yml)",
    )
  })

  it("tells to remove a controller __init__.py, wherever it is", () => {
    const r = validateAgentPackage([
      ...valid(),
      f("controllers/__init__.py", ""),
      f("controllers/generic/__init__.py", ""),
    ])
    const all = messages(r)
    expect(all).toContain("controllers/__init__.py: Not needed — remove it. Condor loads controllers/<name>/<name>.py directly")
    expect(all).toContain("controllers/generic/__init__.py: Not needed — remove it. Condor loads controllers/<name>/<name>.py directly")
  })

  it("marks the list of files to remove as a summary, not a problem of its own", () => {
    const r = validateAgentPackage([...valid(), f("PROFILE.yml", "a: 1\n")])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.filter((e) => e.summary)).toHaveLength(1)
    expect(r.errors.filter((e) => !e.summary)).toEqual([expect.objectContaining({ path: "PROFILE.yml" })])
  })

  it("needs each loop, skill and controller folder's entry file", () => {
    const r = validateAgentPackage([
      ...valid(),
      f("loops/other/shutdown.md", "---\non_kill_switch: keep\n---\n"),
      f("skills/s/notes.md", "# notes\n"),
      f("controllers/pmm/CONTROLLER.md", "---\ntype: market_making\n---\n"),
    ])
    expect(messages(r)).toEqual([
      "loops/other/: Missing loops/other/loop.md",
      "skills/s/: Missing skills/s/SKILL.md",
      "controllers/pmm/: Missing controllers/pmm/pmm.py",
    ])
  })

  it("still stops on a secret in a file that isn't allowed anyway", () => {
    const real = 'pem = "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\\n"\n'
    expect(messages(validateAgentPackage([...valid(), f("tests/k.py", real)])).join()).toMatch(/tests\/k\.py: Contains a private key/)
  })
})

describe("cross-references", () => {
  const loop = (skills: string) => `---\nname: Orchestrate\nskills: ${skills}\ndefault_config: {}\n---\nTick.\n`
  const agent = () => [
    f("AGENT.md", AGENT_MD),
    f("loops/orchestrate/loop.md", loop("[e4_maker]")),
    f("skills/e4_maker/SKILL.md", "---\nname: e4_maker\n---\n"),
    f("controllers/pmm_quad/pmm_quad.py", "class PMMQuadController: ...\n"),
    f("controllers/pmm_quad/CONTROLLER.md", "---\ntype: market_making\n---\n"),
    f("controllers/pmm_quad/sample_configs/race.yml", "controller_name: pmm_quad\n"),
  ]

  it("accepts Condor's controllers/<name>/<name>.py layout without warnings", () => {
    const r = validateAgentPackage(agent())
    expect(messages(r)).toEqual([])
    expect(r.ok && r.warnings).toEqual([])
  })

  it("only warns for a skill that may be a shared Condor skill", () => {
    const r = validateAgentPackage([
      ...agent().filter((x) => !x.path.endsWith("loop.md")),
      f("loops/orchestrate/loop.md", loop("[e4_maker, recover_orphaned_position]")),
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.warnings.map((w) => w.message).join("\n")).toMatch(/Skill `recover_orphaned_position` isn't in the package/)
  })

  it("rejects a loop whose skills aren't a list of names", () => {
    const r = validateAgentPackage([...agent().filter((x) => !x.path.endsWith("loop.md")), f("loops/orchestrate/loop.md", loop("e4_maker"))])
    expect(messages(r).join()).toMatch(/`skills` must be a list/)
  })
})

describe("readAgentZip + buildAgentArchive", () => {
  it("round-trips a zip and hashes identical content identically", async () => {
    const zip = new JSZip()
    for (const file of valid()) zip.file(`grid_bot/${file.path}`, file.content)
    const files = await readAgentZip(await zip.generateAsync({ type: "nodebuffer" }))
    const r = validateAgentPackage(files)
    expect(r.ok).toBe(true)
    if (!r.ok) return

    const a = await buildAgentArchive(r.files)
    const b = await buildAgentArchive([...r.files].reverse().sort((x, y) => x.path.localeCompare(y.path)))
    expect(a.sha256).toBe(b.sha256)
    const reread = await readAgentZip(a.archive)
    expect(reread.map((x) => x.path).sort()).toEqual(r.files.map((x) => x.path).sort())
  })

  it("stops on an archive that expands past the limit", async () => {
    const zip = new JSZip()
    zip.file("AGENT.md", "a".repeat(11 * 1024 * 1024))
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
    expect(buf.length).toBeLessThan(100_000)
    await expect(readAgentZip(buf)).rejects.toBeInstanceOf(AgentPackageReadError)
  })

  it("stops a zip bomb whose headers understate its size", async () => {
    const zip = new JSZip()
    zip.file("AGENT.md", "a".repeat(12 * 1024 * 1024))
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
    // Forge the uncompressed size to 100 bytes in the local and central headers.
    for (let i = 0; i + 4 <= buf.length; i++) {
      const sig = buf.readUInt32LE(i)
      if (sig === 0x04034b50) buf.writeUInt32LE(100, i + 22)
      if (sig === 0x02014b50) buf.writeUInt32LE(100, i + 24)
    }
    await expect(readAgentZip(buf)).rejects.toBeInstanceOf(AgentPackageReadError)
  })

  // A 4MB upload can list tens of thousands of empty entries (security
  // review of #110): refused from the directory, before any is inflated.
  it("refuses a zip with far more entries than an agent has", async () => {
    const zip = new JSZip()
    for (let i = 0; i < 1000; i++) zip.file(`agent/f${i}.md`, "")
    const buf = await zip.generateAsync({ type: "nodebuffer" })
    await expect(readAgentZip(buf)).rejects.toThrow(/too many files/)
  })

  it("refuses a path longer than any real one", async () => {
    const zip = new JSZip()
    zip.file(`agent/${"a".repeat(300)}.md`, "x")
    const buf = await zip.generateAsync({ type: "nodebuffer" })
    await expect(readAgentZip(buf)).rejects.toThrow(/longer than 255 characters/)
  })
})

describe("possible keys (SEC review C2)", () => {
  const HEX64 = "4c0883a69102937d6231471b5dbb6204fe512961708279f1b7e0f4e6a6b01f4c"

  it("flags one for the review instead of refusing the upload, without quoting it", () => {
    const r = validateAgentPackage([
      ...valid().filter((x) => x.path !== "routines/check.py"),
      f("routines/check.py", `TX = "${HEX64}"\n`),
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.warnings).toContainEqual({
      path: "routines/check.py",
      message: expect.stringMatching(/Line 1 .*may be a private key — check it before approving/),
    })
    expect(JSON.stringify(r.warnings)).not.toContain(HEX64)
  })
})


// Security review 2026-11 (L12): twins that differ only in case or Unicode
// form overwrite each other on a case-insensitive Condor install.
describe("validateAgentPackage path twins", () => {
  const pkg = (paths: string[]) => [
    { path: "AGENT.md", content: Buffer.from("---\nname: Grid Bot\ndescription: Runs a grid.\n---\nTrade.\n") },
    ...paths.map((path) => ({ path, content: Buffer.from("x\n") })),
  ]
  const errors = (paths: string[]) => {
    const result = validateAgentPackage(pkg(paths))
    return result.ok ? [] : result.errors.map((e) => e.message)
  }

  it("refuses two paths that differ only in case", () => {
    expect(errors(["skills/x/SKILL.md", "skills/X/SKILL.md"]).join()).toMatch(/apart from case or accents/)
  })

  it("refuses two paths that differ only in Unicode form", () => {
    expect(errors(["skills/café/SKILL.md", "skills/café/SKILL.md"]).join()).toMatch(/apart from case or accents/)
  })

  it("refuses control characters in a path", () => {
    expect(errors(["skills/x\u0007/SKILL.md"]).join()).toMatch(/control characters/)
  })

  it("accepts distinct paths", () => {
    expect(errors(["skills/x/SKILL.md", "skills/y/SKILL.md"]).join()).not.toMatch(/apart from case|control characters/)
  })

  it("ignores twins in build debris that's dropped anyway", () => {
    expect(errors(["skills/x/SKILL.md", ".git/HEAD", ".git/head"]).join()).not.toMatch(/apart from case/)
  })
})
