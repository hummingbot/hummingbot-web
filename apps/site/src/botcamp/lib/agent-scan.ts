import type { AgentPackageFile } from "@/botcamp/lib/agent-package"

// Deterministic pre-scan of an agent package, run before the AI review.
//
// Two kinds of result:
// - blocking: patterns with no legitimate use in a trading agent (decoding and
//   executing hidden code, telling the agent to move funds to an address,
//   addressing the reviewer). These reject without calling the model.
// - hints: things that are often fine in trading code (an HTTP call, reading
//   an env var) but that the reviewer must account for. They go into the AI
//   prompt so nothing obvious is skipped; they never reject on their own.
//
// Rules must stay high-precision: a false blocking match rejects a legitimate
// author with no model in the loop to catch it.

export type ScanCategory =
  | "exfiltration"
  | "credential_access"
  | "fund_movement"
  | "prompt_injection"
  | "remote_code"
  | "shell_exec"
  | "obfuscation"
  | "persistence"

export interface ScanMatch {
  path: string
  line: number
  category: ScanCategory
  rule: string
  excerpt: string
}

interface Rule {
  id: string
  category: ScanCategory
  /** Tested against one line. A RegExp, or a function where a regex can't stay linear. */
  pattern: RegExp | { test(line: string): boolean }
  /** Which files the rule reads. */
  files: "code" | "text" | "all"
  blocking: boolean
  /** What the author is told when a blocking rule rejects the package. */
  message?: string
}

const CODE = /\.(py|sh)$/
const TEXT = /\.(md|txt|ya?ml|json)$/

// An EVM address, or a base58 Solana-style address next to a transfer verb.
const ADDRESS = String.raw`(?:0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})`

// Every pattern runs on every line of every file an uploader sends, so none
// may backtrack: an unbounded repeat followed by more pattern restarts at
// every candidate and scans to the end of the line each time, which on a
// crafted 1 MB line hangs the admin review page for that version. Repeats
// before more pattern are bounded, and the pipe-to-shell check is a split.
const EXEC_REMOTE = /\b(?:exec|eval)\s*\(\s*(?:requests|httpx|urllib|urlopen|aiohttp)\b/
const FETCHES = /\b(?:curl|wget)\b/
const SHELL = /^\s*(?:ba|z)?sh\b/

// `curl … | sh`, `wget … | tee f | bash`: a pipeline where a download comes
// before a shell, however far apart.
function pipesDownloadToShell(line: string): boolean {
  if (!line.includes("|")) return false
  let fetched = false
  for (const segment of line.split("|")) {
    if (fetched && SHELL.test(segment)) return true
    if (FETCHES.test(segment)) fetched = true
  }
  return false
}

const RULES: Rule[] = [
  // ── blocking ──
  {
    id: "exec-decoded",
    category: "obfuscation",
    pattern: /\b(?:exec|eval)\s*\(\s*(?:base64|codecs|zlib|bz2|lzma|marshal|bytes\.fromhex|binascii|__import__)/,
    files: "code",
    blocking: true,
    message: "Executes code decoded at runtime. Ship the code as readable source instead.",
  },
  {
    id: "remote-code",
    category: "remote_code",
    pattern: { test: (line) => EXEC_REMOTE.test(line) || pipesDownloadToShell(line) },
    files: "all",
    blocking: true,
    message: "Downloads and runs code. Everything the agent runs must be in the package.",
  },
  {
    id: "transfer-to-address",
    category: "fund_movement",
    pattern: new RegExp(String.raw`\b(?:withdraw|transfer|send|bridge|sweep)\b[^\n]{0,120}?\b${ADDRESS}\b`, "i"),
    files: "all",
    blocking: true,
    message: "Moves funds to a fixed address. An agent may trade, but never send funds anywhere.",
  },
  {
    id: "addresses-reviewer",
    category: "prompt_injection",
    pattern: /\b(?:security\s+)?reviewer\b[^\n]{0,80}\b(?:approve|clean|safe|ignore|verdict)|\b(?:mark|classify|rate)\s+(?:this|the)\s+(?:package|agent|file)\s+as\s+(?:clean|safe|approved)/i,
    files: "all",
    blocking: true,
    message: "Contains text aimed at the security review. Remove instructions addressed to reviewers.",
  },
  // ── hints ──
  { id: "dynamic-exec", category: "remote_code", pattern: /\b(?:exec|eval|compile)\s*\(|\b__import__\s*\(|importlib\.import_module\s*\(/, files: "code", blocking: false },
  { id: "shell", category: "shell_exec", pattern: /\bsubprocess\.|\bos\.(?:system|popen|exec[lv]p?e?|spawn)\b|\bpty\.spawn\b/, files: "code", blocking: false },
  { id: "env-read", category: "credential_access", pattern: /\bos\.environ\b|\bos\.getenv\s*\(|\bdotenv\b|load_dotenv\s*\(/, files: "code", blocking: false },
  { id: "secret-file", category: "credential_access", pattern: /["'][^"'\n]{0,300}?(?:\.env|id_rsa|\.ssh\/|\.aws\/|credentials|config\.yml|keystore|private_key)[^"'\n]{0,300}["']/i, files: "code", blocking: false },
  { id: "raw-network", category: "exfiltration", pattern: /\bsocket\.|\bsmtplib\b|\bftplib\b|\bparamiko\b|\btelnetlib\b/, files: "code", blocking: false },
  { id: "deserialize", category: "remote_code", pattern: /\bpickle\.loads?\s*\(|\bmarshal\.loads?\s*\(|\bdill\.loads?\s*\(|yaml\.load\s*\([^)]{0,300}Loader\s*=\s*yaml\.(?:Unsafe)?Loader/, files: "code", blocking: false },
  { id: "persistence", category: "persistence", pattern: /\bcrontab\b|\/etc\/|systemctl|launchctl|~\/\.(?:bashrc|zshrc|profile)|\.\.\/\.\.\//, files: "code", blocking: false },
  { id: "long-blob", category: "obfuscation", pattern: /["'][A-Za-z0-9+/=]{240,}["']/, files: "code", blocking: false },
  { id: "indirect-builtin", category: "obfuscation", pattern: /getattr\s*\(\s*(?:__builtins__|builtins)\b|__builtins__\s*\[|globals\(\)\s*\[\s*["']__builtins__/, files: "code", blocking: false },
  { id: "encoded-text", category: "obfuscation", pattern: /\brot_?13\b|codecs\.decode\s*\(|bytes\.fromhex\s*\(|\bb(?:85|32|64)decode\s*\(/, files: "code", blocking: false },
  { id: "override-instructions", category: "prompt_injection", pattern: /\bignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier|the\s+operator'?s?)\s+(?:instructions|rules|prompts?)/i, files: "text", blocking: false },
  { id: "reveal-secrets", category: "credential_access", pattern: /\b(?:print|reveal|share|post|send|output|export|include|paste|dump)\b[^\n]{0,80}(?:\b(?:api[\s_-]?keys?|secrets?|private[\s_-]?key|seed phrase|mnemonic|credentials)\b|\.env\b|config\.yml)/i, files: "text", blocking: false },
  { id: "withdraw-mention", category: "fund_movement", pattern: /\bwithdraw(?:al|s)?\b|\btransfer\s+(?:all|funds|balance)/i, files: "all", blocking: false },
]

// Hosts a trading agent plausibly calls; any other literal URL in code is a
// hint for the reviewer to justify, not a rejection.
const KNOWN_HOSTS = [
  /(?:^|\.)binance\.(?:com|us)$/, /(?:^|\.)bybit\.com$/, /(?:^|\.)okx\.com$/, /(?:^|\.)bitget\.com$/,
  /(?:^|\.)kucoin\.com$/, /(?:^|\.)gate\.(?:io|com)$/, /(?:^|\.)kraken\.com$/, /(?:^|\.)coinbase\.com$/,
  /(?:^|\.)hyperliquid\.xyz$/, /(?:^|\.)dydx\.(?:exchange|trade)$/, /(?:^|\.)mexc\.com$/, /(?:^|\.)htx\.com$/,
  /(?:^|\.)coingecko\.com$/, /(?:^|\.)geckoterminal\.com$/, /(?:^|\.)coinmarketcap\.com$/,
  /(?:^|\.)solana\.com$/, /(?:^|\.)jup\.ag$/, /(?:^|\.)meteora\.ag$/, /(?:^|\.)raydium\.io$/, /(?:^|\.)orca\.so$/,
  /(?:^|\.)xrpl\.org$/, /(?:^|\.)flare\.network$/, /(?:^|\.)binance\.vision$/,
  /^localhost$/, /^127\.0\.0\.1$/, /(?:^|\.)hummingbot\.(?:org|io)$/, /(?:^|\.)github\.com$/,
]
const URL_IN_CODE = /https?:\/\/([a-z0-9.-]+)(?::\d+)?/gi

export interface ScanResult {
  blocking: (ScanMatch & { message: string })[]
  hints: ScanMatch[]
}

const MAX_HINTS_PER_RULE = 8

export function scanAgentPackage(files: AgentPackageFile[]): ScanResult {
  const blocking: ScanResult["blocking"] = []
  const hints: ScanMatch[] = []
  const perRule = new Map<string, number>()

  const push = (match: ScanMatch, rule?: Rule) => {
    if (rule?.blocking) {
      blocking.push({ ...match, message: rule.message! })
      return
    }
    const seen = perRule.get(match.rule) ?? 0
    if (seen >= MAX_HINTS_PER_RULE) return
    perRule.set(match.rule, seen + 1)
    hints.push(match)
  }

  for (const file of files) {
    const isCode = CODE.test(file.path)
    const isText = TEXT.test(file.path)
    const lines = file.content.toString("utf8").split("\n")
    lines.forEach((text, i) => {
      for (const rule of RULES) {
        if (rule.files === "code" && !isCode) continue
        if (rule.files === "text" && !isText) continue
        if (!rule.pattern.test(text)) continue
        push(
          { path: file.path, line: i + 1, category: rule.category, rule: rule.id, excerpt: text.trim().slice(0, 200) },
          rule,
        )
      }
      if (!isCode) return
      for (const [, host] of text.matchAll(URL_IN_CODE)) {
        if (KNOWN_HOSTS.some((h) => h.test(host.toLowerCase()))) continue
        push({
          path: file.path,
          line: i + 1,
          category: "exfiltration",
          rule: "unknown-host",
          excerpt: text.trim().slice(0, 200),
        })
      }
    })
  }
  return { blocking, hints }
}
