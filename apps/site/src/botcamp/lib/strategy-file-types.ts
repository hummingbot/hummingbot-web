// The kinds of file a builder may attach to a strategy: code, config, notebooks,
// docs and archives — what strategies on prod actually carry (2026-10-29: .py,
// .md, .yml, .zip, .rs, .ipynb, .txt, .sh, .toml, .json, .jsonl, .patch,
// .lock, LICENSE/NOTICE). Files are only ever downloaded or shown as text, but
// a strategy page shouldn't be a place to host a .html, .svg, .exe or .php
// for other people to fetch. Admins aren't held to it.
const TEXT_EXTENSIONS = [
  "py", "pyx", "pyi", "ipynb",
  "rs", "js", "ts", "go", "sol",
  "md", "txt", "rst",
  "yml", "yaml", "json", "jsonl", "toml", "ini", "cfg", "conf", "env.example",
  "csv", "tsv",
  "sh", "patch", "diff", "lock", "sql",
] as const
const ARCHIVE_EXTENSIONS = ["zip"] as const
// Extensionless files a repo commonly carries.
const BARE_NAMES = ["LICENSE", "NOTICE", "README", "Makefile", "Dockerfile", "requirements.txt"] as const

export const STRATEGY_FILE_ACCEPT = [...TEXT_EXTENSIONS, ...ARCHIVE_EXTENSIONS].map((ext) => `.${ext}`).join(",")

/**
 * The Content-Type to store for an allowed strategy file, or null when its name
 * isn't one strategies may carry. Decided by the name, never by the type the
 * client claimed.
 */
export function strategyFileContentType(filename: string): string | null {
  const base = filename.split("/").pop() ?? ""
  if ((BARE_NAMES as readonly string[]).includes(base.replace(/\s\(\d+\)$/, ""))) return "text/plain; charset=utf-8"
  const lower = base.toLowerCase()
  const ext = TEXT_EXTENSIONS.find((e) => lower.endsWith(`.${e}`)) ?? ARCHIVE_EXTENSIONS.find((e) => lower.endsWith(`.${e}`))
  if (!ext) return null
  return (ARCHIVE_EXTENSIONS as readonly string[]).includes(ext) ? "application/zip" : "text/plain; charset=utf-8"
}

export const STRATEGY_FILE_TYPES_LABEL = "code, config, notebook, docs or .zip files (.py, .md, .yml, .json, .ipynb, …)"
