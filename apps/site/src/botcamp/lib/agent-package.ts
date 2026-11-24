import { createHash } from "crypto"
import JSZip from "jszip"
import type { Readable } from "stream"
import yaml from "js-yaml"
import { describePossibleKey, describeSecret, findPossibleKeys, findSecrets } from "@/botcamp/lib/agent-secrets"

// Structure check for a Condor agent package — the folder Condor loads from
// `agents/<slug>/`. Not an AI review: a fixed allowlist, modelled on Condor's
// own agents (agents/market_making_expert is the reference):
//
//   AGENT.md                                   required; frontmatter: name, agent_key, tools
//   shutdown.md, reflect.md, core_rules.md     optional; Condor reads them per agent
//   loops/<loop>/loop.md                       frontmatter: skills, default_config
//   loops/<loop>/shutdown.md                   optional
//   skills/<skill>/SKILL.md                    + other .md files the skill refers to
//   routines/<routine>.py
//   controllers/<name>/<name>.py               + CONTROLLER.md, sample_configs/<style>.yml
//   docs/**/*.md                               notes about the agent, never loaded
//
// Anything else refuses the upload, naming each file to remove — a README,
// PROFILE.yml, conf/, a loop's config.yml, tests/, Hummingbot's
// controllers/<type>/<name>.py. Build/OS debris (.DS_Store, __pycache__) is
// dropped silently. Files outside the AGENT.md folder (a repo holding the
// agent in agents/<slug>/) aren't part of the package and are left out.
//
// Pure: takes the files, returns errors, warnings, and the normalized zip
// that gets stored and served to Condor.
//
// Strict on purpose. Only text files are allowed, since the AI review that
// follows has to be able to read everything Condor would load.

export interface AgentPackageFile {
  path: string
  content: Buffer
  isSymlink?: boolean
}

export interface AgentPackageIssue {
  path?: string
  message: string
  /** The one-line list of files to remove, above their own errors — not a problem of its own. */
  summary?: true
}

export interface AgentManifest {
  name: string
  agentKey: string | null
  tools: string[]
  loops: string[]
}

// Every file under the package root, as the check saw it. Paths are relative
// to the AGENT.md folder. Files with an error are listed too; the errors carry
// their paths. `leftOut` is always null now that the check refuses files
// outside the structure instead of leaving them out; kept for the report UI.
export interface AgentPackageTreeEntry {
  path: string
  leftOut: string | null
}

export type AgentPackageResult =
  | {
      ok: true
      manifest: AgentManifest
      /** AGENT.md's frontmatter `description`, to prefill the agent's summary. */
      description: string | null
      warnings: AgentPackageIssue[]
      files: AgentPackageFile[]
      tree: AgentPackageTreeEntry[]
    }
  | { ok: false; errors: AgentPackageIssue[]; warnings: AgentPackageIssue[]; tree: AgentPackageTreeEntry[] }

export const AGENT_PACKAGE_LIMITS = {
  maxFiles: 300,
  maxFileBytes: 1024 * 1024,
  maxTotalBytes: 5 * 1024 * 1024,
}

const ALLOWED_EXTENSIONS = new Set([".md", ".yml", ".yaml", ".py", ".json", ".txt", ".sh"])

// Build/OS debris: dropped silently rather than failing the upload.
const IGNORED_SEGMENTS = new Set([
  "__pycache__", ".git", ".DS_Store", "__MACOSX", ".pytest_cache", ".venv", "node_modules",
  ".gitignore", ".gitkeep", ".gitattributes",
])

const ENV_TEMPLATE = /^\.env\.(example|sample|template)$/i
const SECRET_FILENAME = /^(\.env(\..*)?|.*\.pem|.*\.key|id_rsa|id_ed25519)$/i
// The header alone isn't enough: redaction tests quote it around dummy text.
// Real key material follows it — base64, after a newline or a literal "\n".
const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z ]*PRIVATE KEY-----(?:\s|\\n)*[A-Za-z0-9+/=]{40,}/

// Hummingbot V2 loads controllers from controllers/<controller_type>/.
const CONTROLLER_TYPES = new Set(["generic", "market_making", "directional_trading"])

// Condor's own rule for what an agent's library is (condor/layering.py:
// `_RUNTIME_NAMES`, `_root_library_dirs`, `is_library_path`). Kept in step by
// hand — a drift either way is an agent Botcamp approves and Condor refuses.
const CONDOR_LIBRARY_DIRS = new Set(["controllers", "loops", "routines", "skills"])
const CONDOR_RUNTIME_NAMES = new Set([
  "store", "proposals", "mutes.yml", "delegations", "sessions", "dry_runs", "learnings.md",
  "state.json", "config.yml", "owned_bots.json", "disowned_bots.json", ".server_backups", "__pycache__",
])

// Why Condor would refuse to install `path`, or null when it is library content.
export function condorLeavesOut(path: string): string | null {
  const parts = path.split("/").filter(Boolean)
  if (parts.some((part) => part.startsWith("."))) return "hidden files"
  if (parts.some((part) => CONDOR_RUNTIME_NAMES.has(part))) return "runtime state Condor writes itself"
  if (parts.length > 1 && !CONDOR_LIBRARY_DIRS.has(parts[0])) {
    return `folders outside ${[...CONDOR_LIBRARY_DIRS].join("/, ")}/`
  }
  return null
}

// The agent structure (see the header). Why `path`, relative to the AGENT.md
// folder, isn't allowed in an agent, or null when it is.
export const AGENT_ROOT_FILES = ["AGENT.md", "shutdown.md", "reflect.md", "core_rules.md"]
export const AGENT_FOLDERS = ["loops", "skills", "routines", "controllers", "docs"]

export function structureIssue(path: string): string | null {
  const parts = path.split("/")
  const [top] = parts
  const name = parts[parts.length - 1]
  const ext = extension(path)

  if (parts.length === 1) {
    return AGENT_ROOT_FILES.includes(name)
      ? null
      : `Not part of an agent — the top level only takes ${AGENT_ROOT_FILES.join(", ")} and the folders ${AGENT_FOLDERS.map((f) => `${f}/`).join(", ")}`
  }

  switch (top) {
    case "loops":
      if (parts.length !== 3) return "Loops go in their own folder: loops/<loop>/loop.md"
      return name === "loop.md" || name === "shutdown.md" ? null : "A loop folder only takes loop.md and shutdown.md"
    case "skills":
      if (parts.length !== 3) return "Skills go in their own folder: skills/<skill>/SKILL.md, with no subfolders"
      return ext === ".md" ? null : "A skill folder only takes markdown files (SKILL.md and the .md files it refers to)"
    case "routines":
      return parts.length === 2 && ext === ".py" ? null : "routines/ only takes .py files, with no subfolders"
    case "controllers": {
      if (name === "__init__.py") return "Not needed — remove it. Condor loads controllers/<name>/<name>.py directly"
      if (parts.length === 2) return "Controllers go in their own folder: controllers/<name>/<name>.py"
      const controller = parts[1]
      if (parts.length === 3 && CONTROLLER_TYPES.has(controller) && ext === ".py") {
        const base = name.slice(0, -".py".length)
        return (
          `Hummingbot layout, which Condor doesn't load — move it to controllers/${base}/${base}.py, with a ` +
          `CONTROLLER.md saying \`type: ${controller}\` and its configs in controllers/${base}/sample_configs/`
        )
      }
      // Condor reserves `config`: every config.yml is runtime state to it
      // (agent_controllers.py RESERVED_SAMPLE), so the sample would vanish.
      if (parts.length === 4 && parts[2] === "sample_configs" && /^config\.ya?ml$/.test(name)) {
        return "Condor drops a sample named `config` — rename it (e.g. balanced.yml)"
      }
      const ok =
        (parts.length === 3 && (name === `${controller}.py` || name === "CONTROLLER.md")) ||
        (parts.length === 4 && parts[2] === "sample_configs" && (ext === ".yml" || ext === ".yaml"))
      return ok
        ? null
        : `A controller folder only takes ${controller}.py, CONTROLLER.md and sample_configs/*.yml`
    }
    case "docs":
      return ext === ".md" ? null : "docs/ only takes markdown files"
    default:
      return `Folder ${top}/ isn't part of an agent — only ${AGENT_FOLDERS.map((f) => `${f}/`).join(", ")} are`
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

function extension(path: string): string {
  const base = path.split("/").pop() ?? ""
  const dot = base.lastIndexOf(".")
  return dot > 0 ? base.slice(dot).toLowerCase() : ""
}

function isUnsafePath(path: string): boolean {
  return (
    path.startsWith("/") ||
    path.includes("\\") ||
    /^[a-zA-Z]:/.test(path) ||
    path.split("/").some((seg) => seg === ".." || seg === ".")
  )
}

function parseFrontmatter(text: string): { data: unknown } | { error: string } | null {
  const match = FRONTMATTER.exec(text)
  if (!match) return null
  try {
    return { data: yaml.load(match[1]) }
  } catch (e) {
    return { error: e instanceof Error ? e.message.split("\n")[0] : "Invalid YAML" }
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

export function validateAgentPackage(input: AgentPackageFile[]): AgentPackageResult {
  const errors: AgentPackageIssue[] = []
  const warnings: AgentPackageIssue[] = []

  // Unsafe paths fail before anything else looks at them.
  const candidates: AgentPackageFile[] = []
  // Paths that differ only in case or Unicode form are one file on a
  // case-insensitive or normalizing filesystem (macOS, Windows): Condor would
  // install whichever came last, not necessarily the one that was reviewed.
  const seenPaths = new Map<string, string>()
  for (const file of input) {
    if (isUnsafePath(file.path)) {
      errors.push({ path: file.path, message: "Unsafe path (absolute, backslash, or ..)" })
      continue
    }
    // Build debris is dropped before the path checks below, which only
    // matter for files that are kept.
    if (file.path.split("/").some((seg) => IGNORED_SEGMENTS.has(seg))) continue
    if (/[\x00-\x1f\x7f]/.test(file.path)) {
      errors.push({ path: file.path, message: "Path contains control characters" })
      continue
    }
    const key = file.path.normalize("NFC").toLowerCase()
    const twin = seenPaths.get(key)
    if (twin !== undefined && twin !== file.path) {
      errors.push({ path: file.path, message: `Same path as ${twin} apart from case or accents — rename one` })
      continue
    }
    seenPaths.set(key, file.path)
    candidates.push(file)
  }

  // The package root is the folder holding the shallowest AGENT.md, so a zip
  // of the folder, a GitHub repo, and a repo with agents/<slug>/ all work.
  const agentMds = candidates.filter((f) => f.path.split("/").pop() === "AGENT.md")
  if (agentMds.length === 0) {
    errors.push({ message: "No AGENT.md found" })
    return { ok: false, errors, warnings, tree: [] }
  }
  const depth = (p: string) => p.split("/").length
  const shallowest = Math.min(...agentMds.map((f) => depth(f.path)))
  const roots = agentMds.filter((f) => depth(f.path) === shallowest)
  if (roots.length > 1) {
    errors.push({
      message: `Found ${roots.length} AGENT.md files at the same level (${roots.map((f) => f.path).join(", ")}) — upload one agent at a time`,
    })
    return { ok: false, errors, warnings, tree: [] }
  }
  const prefix = roots[0].path.slice(0, -"AGENT.md".length)

  const rooted: AgentPackageFile[] = []
  let outside = 0
  for (const file of candidates) {
    if (!file.path.startsWith(prefix)) {
      outside++
      continue
    }
    rooted.push({ ...file, path: file.path.slice(prefix.length) })
  }
  if (outside > 0) {
    warnings.push({ message: `${outside} file(s) outside the AGENT.md folder (${prefix || "root"}) were left out` })
  }

  // Safety first, on every file — a secret is a mistake worth stopping on
  // even in a file that would have been left out anyway.
  const files: AgentPackageFile[] = []
  const notAllowed: AgentPackageIssue[] = []
  for (const file of rooted) {
    const name = file.path.split("/").pop() ?? ""
    if (file.isSymlink) {
      errors.push({ path: file.path, message: "Symlinks are not allowed" })
      continue
    }
    if (SECRET_FILENAME.test(name) && !ENV_TEMPLATE.test(name)) {
      errors.push({ path: file.path, message: "Looks like a secrets file — remove it before uploading" })
      continue
    }
    const text = file.content.toString("utf8")
    if (PRIVATE_KEY_BLOCK.test(text)) {
      errors.push({ path: file.path, message: "Contains a private key" })
      continue
    }
    const secrets = findSecrets(text)
    if (secrets.length > 0) {
      errors.push(...secrets.map((secret) => ({ path: file.path, message: describeSecret(secret) })))
      continue
    }
    // A value that may be a key is a tx hash as often as not, so it doesn't
    // refuse the upload: it rides on the version as a warning, in front of the
    // AI review and the admin, before anyone can clone it (SEC review C2).
    warnings.push(...findPossibleKeys(text).map((key) => ({ path: file.path, message: describePossibleKey(key) })))
    const issue = structureIssue(file.path)
    if (issue) {
      notAllowed.push({ path: file.path, message: issue })
      continue
    }
    files.push(file)
  }
  const tree: AgentPackageTreeEntry[] = rooted
    .map((file) => ({ path: file.path, leftOut: null }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  if (notAllowed.length > 0) {
    errors.push({
      message:
        `${notAllowed.length} file(s) aren't part of the agent structure — remove them and upload again: ` +
        notAllowed.map((issue) => issue.path).join(", "),
      summary: true,
    })
    errors.push(...notAllowed)
  }

  // Every loop, skill and controller folder needs its entry file.
  const kept = new Set(files.map((f) => f.path))
  const folders = new Map<string, string>()
  for (const file of files) {
    const [top, folder] = file.path.split("/")
    if (top === "loops") folders.set(`loops/${folder}`, `loops/${folder}/loop.md`)
    else if (top === "skills") folders.set(`skills/${folder}`, `skills/${folder}/SKILL.md`)
    else if (top === "controllers" && !CONTROLLER_TYPES.has(folder)) {
      folders.set(`controllers/${folder}`, `controllers/${folder}/${folder}.py`)
    }
  }
  for (const [folder, entry] of folders) {
    if (!kept.has(entry)) errors.push({ path: `${folder}/`, message: `Missing ${entry}` })
  }

  if (files.length > AGENT_PACKAGE_LIMITS.maxFiles) {
    errors.push({ message: `Too many files (${files.length}, max ${AGENT_PACKAGE_LIMITS.maxFiles})` })
  }
  const total = files.reduce((sum, f) => sum + f.content.length, 0)
  if (total > AGENT_PACKAGE_LIMITS.maxTotalBytes) {
    errors.push({ message: `Package too large (${total} bytes, max ${AGENT_PACKAGE_LIMITS.maxTotalBytes})` })
  }

  for (const file of files) {
    if (!ALLOWED_EXTENSIONS.has(extension(file.path))) {
      errors.push({
        path: file.path,
        message: `File type not allowed (allowed: ${[...ALLOWED_EXTENSIONS].join(" ")})`,
      })
      continue
    }
    if (file.content.length > AGENT_PACKAGE_LIMITS.maxFileBytes) {
      errors.push({ path: file.path, message: `File too large (max ${AGENT_PACKAGE_LIMITS.maxFileBytes} bytes)` })
      continue
    }
    const text = file.content.toString("utf8")
    if (text.includes("�") || text.includes("\u0000")) {
      errors.push({ path: file.path, message: "Not a UTF-8 text file" })
      continue
    }

    const ext = extension(file.path)
    if (ext === ".yml" || ext === ".yaml") {
      try {
        yaml.load(text)
      } catch (e) {
        errors.push({ path: file.path, message: `Invalid YAML: ${e instanceof Error ? e.message.split("\n")[0] : e}` })
      }
    } else if (ext === ".json") {
      try {
        JSON.parse(text)
      } catch {
        errors.push({ path: file.path, message: "Invalid JSON" })
      }
    }
  }

  // AGENT.md frontmatter is what Condor reads to register the agent.
  const agentMd = files.find((f) => f.path === "AGENT.md")!
  const fm = parseFrontmatter(agentMd.content.toString("utf8"))
  let manifest: AgentManifest | null = null
  let description: string | null = null
  if (!fm) {
    errors.push({ path: "AGENT.md", message: "Missing YAML frontmatter (--- … ---)" })
  } else if ("error" in fm) {
    errors.push({ path: "AGENT.md", message: `Invalid frontmatter: ${fm.error}` })
  } else if (!isRecord(fm.data)) {
    errors.push({ path: "AGENT.md", message: "Frontmatter must be a YAML mapping" })
  } else {
    const { name, agent_key, tools } = fm.data
    if (typeof fm.data.description === "string" && fm.data.description.trim()) {
      description = fm.data.description.trim()
    }
    if (typeof name !== "string" || !name.trim()) {
      errors.push({ path: "AGENT.md", message: "Frontmatter `name` is required" })
    }
    if (tools !== undefined && !(Array.isArray(tools) && tools.every((t) => typeof t === "string"))) {
      errors.push({ path: "AGENT.md", message: "Frontmatter `tools` must be a list of tool names" })
    }
    if (typeof agent_key !== "string" || !agent_key.trim()) {
      warnings.push({ path: "AGENT.md", message: "No `agent_key` — Condor will use its default model" })
    }
    manifest = {
      name: typeof name === "string" ? name.trim() : "",
      agentKey: typeof agent_key === "string" && agent_key.trim() ? agent_key.trim() : null,
      tools: Array.isArray(tools) ? tools.filter((t): t is string => typeof t === "string") : [],
      loops: [],
    }
  }

  const paths = new Set(files.map((f) => f.path))

  for (const file of files) {
    const match = /^loops\/([^/]+)\/loop\.md$/.exec(file.path)
    if (!match) continue
    manifest?.loops.push(match[1])
    const loopFm = parseFrontmatter(file.content.toString("utf8"))
    if (!loopFm) {
      warnings.push({ path: file.path, message: "No frontmatter — the loop has no default_config" })
      continue
    }
    if ("error" in loopFm) {
      errors.push({ path: file.path, message: `Invalid frontmatter: ${loopFm.error}` })
      continue
    }
    if (!isRecord(loopFm.data) || !isRecord(loopFm.data.default_config)) {
      warnings.push({ path: file.path, message: "Frontmatter has no `default_config` mapping" })
    }
    // A skill the loop names but the package lacks may be a shared Condor
    // skill (agents/_shared/skills), so it only warns.
    const skills = isRecord(loopFm.data) ? loopFm.data.skills : undefined
    if (skills === undefined) continue
    if (!Array.isArray(skills) || !skills.every((s) => typeof s === "string")) {
      errors.push({ path: file.path, message: "Frontmatter `skills` must be a list of skill names" })
      continue
    }
    for (const skill of skills) {
      if (!paths.has(`skills/${skill}/SKILL.md`)) {
        warnings.push({
          path: file.path,
          message: `Skill \`${skill}\` isn't in the package (skills/${skill}/SKILL.md) — fine only if it's a shared Condor skill`,
        })
      }
    }
  }

  if (errors.length > 0 || !manifest) return { ok: false, errors, warnings, tree }
  manifest.loops.sort()
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return { ok: true, manifest, description, warnings, files, tree }
}

export class AgentPackageReadError extends Error {}

const archiveTooLarge = () => new AgentPackageReadError("Archive expands past the size limit")

// Checked on the zip's directory before anything is inflated. A 4MB upload
// can list tens of thousands of empty entries, each costing a stream to open,
// and the package's own file limit (maxFiles) is only applied after every one
// is read. The headroom covers build debris the check drops (.DS_Store,
// __pycache__); a real agent is well under maxFiles.
const MAX_ARCHIVE_ENTRIES = AGENT_PACKAGE_LIMITS.maxFiles * 3
const MAX_PATH_LENGTH = 255

// Inflate one entry as a stream, stopping as soon as it passes maxBytes. The
// size in the zip header is the uploader's claim, so it can't bound memory.
// Also used for linked GitHub zipballs (strategy-link-embed.ts).
export function inflateCapped(entry: JSZip.JSZipObject, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let stopped = false
    const stream = entry.nodeStream("nodebuffer") as Readable
    stream
      .on("data", (chunk: Buffer) => {
        if (stopped) return
        size += chunk.length
        if (size > maxBytes) {
          stopped = true
          stream.destroy()
          reject(archiveTooLarge())
          return
        }
        chunks.push(chunk)
      })
      .on("error", (err: Error) => {
        if (!stopped) reject(err)
      })
      .on("end", () => {
        if (!stopped) resolve(Buffer.concat(chunks))
      })
  })
}

// Read an uploaded zip without trusting it. The declared sizes in the zip
// headers fail an honest oversized archive fast; each entry is then inflated
// as a stream and cut off at the limit, so a forged header can't fill memory.
export async function readAgentZip(buffer: Buffer): Promise<AgentPackageFile[]> {
  const zip = await JSZip.loadAsync(buffer)
  const entries = Object.values(zip.files)
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new AgentPackageReadError(`The folder has too many files (${entries.length}) to be an agent`)
  }
  if (entries.some((entry) => entry.name.length > MAX_PATH_LENGTH)) {
    throw new AgentPackageReadError(`A path in the folder is longer than ${MAX_PATH_LENGTH} characters`)
  }
  const files: AgentPackageFile[] = []
  const maxArchiveBytes = AGENT_PACKAGE_LIMITS.maxTotalBytes * 2
  let total = 0
  for (const entry of entries) {
    if (entry.dir) continue
    const declared = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0
    if (declared > AGENT_PACKAGE_LIMITS.maxTotalBytes || total + declared > maxArchiveBytes) {
      throw archiveTooLarge()
    }
    const content = await inflateCapped(entry, Math.min(AGENT_PACKAGE_LIMITS.maxTotalBytes, maxArchiveBytes - total))
    total += content.length
    // Unix mode 0o120000 marks a symlink entry.
    const mode = typeof entry.unixPermissions === "number" ? entry.unixPermissions : 0
    files.push({ path: entry.name, content, isSymlink: (mode & 0o170000) === 0o120000 })
  }
  return files
}

// Fixed timestamps and sorted paths make the archive byte-identical for
// identical content, so the sha256 identifies the package, not the upload.
const FIXED_DATE = new Date("2000-01-01T00:00:00Z")

export async function buildAgentArchive(files: AgentPackageFile[]): Promise<{ archive: Buffer; sha256: string }> {
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.path, file.content, { date: FIXED_DATE, createFolders: false })
  }
  const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  return { archive, sha256: createHash("sha256").update(archive).digest("hex") }
}
