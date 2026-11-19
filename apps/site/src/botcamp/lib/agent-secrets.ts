import { BIP39_ENGLISH } from "@/botcamp/lib/bip39-english"

// Secrets that stop an agent upload outright, whatever its source. The two
// wallet shapes — a BIP-39 recovery phrase, a Solana keypair exported as 64
// bytes — are the "certain" ones in Condor's hub contract (§6.2), detected
// the way condor/runtime/secrets.py detects them. On top of those Botcamp
// refuses what can only be a credential: provider-prefixed API keys and
// tokens, keys in a URL's query, and a secret-named setting given a real
// value. Bare ambiguous shapes (64 hex, long base58) are left to the review:
// they are just as often a tx hash or a signature.
//
// Findings carry the file's line, never the matched text — a refusal is no
// safer a place for a recovery phrase than the file it came from.

const WORDS = new Set(BIP39_ENGLISH)
// Twelve is the shortest mnemonic BIP-39 defines; a shorter run is chance.
const SEED_MIN_WORDS = 12
const ORDINAL = /^\d{1,2}[.)]/

// A bracketed run of exactly 64 small ints; the 0–255 bound is checked after.
const KEYPAIR_ARRAY = /\[\s*\d{1,3}(?:\s*,\s*\d{1,3}){63}\s*,?\s*\]/g

// Prefixes only a credential carries: OpenAI/Anthropic, AWS access key ids,
// GitHub tokens, Telegram bot tokens, Slack tokens. AWS's documented
// example key (AKIA…EXAMPLE) is quoted in docs, so it passes.
const PROVIDER_KEY =
  /\bsk-[A-Za-z0-9_-]{20,}|\bAKIA(?![0-9A-Z]{9}EXAMPLE\b)[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b|\bxox[abprs]-[A-Za-z0-9-]{10,}/

// An RPC or API URL carrying its key: ?api-key=…, &access_token=…. Not a bare
// token=/key=: DEX and price APIs take a token's mint or address that way.
const KEY_IN_URL = /[?&](?:api[-_]?key|apikey|access[-_]?token|auth[-_]?token)=[A-Za-z0-9_-]{16,}/i

// `private_key: 0x…`, `API_SECRET = "…"`. The value must look like a secret —
// 20+ key-like characters mixing letters and digits — so placeholders
// (YOUR_API_KEY, ${ENV}, ""), code (config.password, os.getenv(…)) and account
// names (binance_main_2) pass. So does a short hand-written password: the cost
// of that 20, which is an open call in the PR.
const SECRET_ASSIGNMENT =
  /\b(?:api[-_]?key|api[-_]?secret|secret[-_]?key|client[-_]?secret|secret|password|passphrase|private[-_]?key)\b["']?\s*[:=]\s*["']?([^\s"',#}]+)/gi

export interface SecretFinding {
  kind: "recovery-phrase" | "solana-keypair" | "api-key" | "credential"
  line: number
}

// Line numbers by offset. Counting newlines from the start for every match
// was quadratic: a 1 MB file of hex lines has ~15,000 matches, each counting
// up to a megabyte. The line starts are found once, then binary-searched.
function lineIndex(text: string): (offset: number) => number {
  const starts = [0]
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) starts.push(i + 1)
  return (offset) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

// A run of SEED_MIN_WORDS+ wordlist words, separated by whitespace or commas
// and optionally numbered ("1. legal 2. winner"), in any case.
function recoveryPhraseAt(text: string): number | null {
  const token = /[^\s,]+/g
  let run = 0
  let runStart = 0
  for (let match = token.exec(text); match; match = token.exec(text)) {
    let word = match[0]
    const ordinal = ORDINAL.exec(word)
    if (ordinal) {
      word = word.slice(ordinal[0].length)
      // A bare "1." is numbering, not a word that breaks the run.
      if (!word) continue
    }
    if (WORDS.has(word.toLowerCase())) {
      if (run === 0) runStart = match.index
      run++
      if (run >= SEED_MIN_WORDS) return runStart
    } else {
      run = 0
    }
  }
  return null
}

function keypairArrayAt(text: string): number | null {
  for (const match of text.matchAll(KEYPAIR_ARRAY)) {
    const bytes = match[0].slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean)
    if (bytes.every((b) => Number(b) <= 255)) return match.index ?? 0
  }
  return null
}

function looksLikeSecretValue(value: string): boolean {
  return value.length >= 20 && /^[A-Za-z0-9+/=_-]+$/.test(value) && /\d/.test(value) && /[A-Za-z]/.test(value)
}

function credentialAt(text: string): number | null {
  const inUrl = KEY_IN_URL.exec(text)
  let first = inUrl ? inUrl.index : null
  for (const match of text.matchAll(SECRET_ASSIGNMENT)) {
    if (looksLikeSecretValue(match[1])) {
      const at = match.index ?? 0
      if (first === null || at < first) first = at
      break
    }
  }
  return first
}

export function findSecrets(text: string): SecretFinding[] {
  const findings: SecretFinding[] = []
  const lineAt = lineIndex(text)
  const phrase = recoveryPhraseAt(text)
  if (phrase !== null) findings.push({ kind: "recovery-phrase", line: lineAt(phrase) })
  const keypair = keypairArrayAt(text)
  if (keypair !== null) findings.push({ kind: "solana-keypair", line: lineAt(keypair) })
  const apiKey = PROVIDER_KEY.exec(text)
  if (apiKey) findings.push({ kind: "api-key", line: lineAt(apiKey.index) })
  const credential = credentialAt(text)
  if (credential !== null) findings.push({ kind: "credential", line: lineAt(credential) })
  return findings
}

const SECRET_DESCRIPTIONS: Record<SecretFinding["kind"], string> = {
  "recovery-phrase": "a value shaped like a BIP-39 recovery phrase",
  "solana-keypair": "a value shaped like a Solana keypair (64 bytes)",
  "api-key": "an API key or token",
  credential: "a key, password or private key set to a real value",
}

export function describeSecret(finding: SecretFinding): string {
  const what = SECRET_DESCRIPTIONS[finding.kind]
  return `Line ${finding.line} carries ${what} — a secret. Remove it and upload again; nothing from this upload was stored.`
}

// ── Possible keys: flagged for the review, never refused (SEC review C2) ──
//
// A bare 64-hex is an EVM private key or a tx hash; an 87–88-char base58 is a
// Solana secret or a transaction signature. Neither can be refused outright,
// and refusing here wouldn't un-send it anyway — the upload has already left
// the author's machine. So each one becomes a warning on the version, which
// the AI review and the admin see before anyone can clone it. Condor stops on
// the same shapes before a publish leaves the box (condor/agents/bundle_review.py).

export type PossibleKeyKind = "evm-hex64" | "solana-b58-64"

export interface PossibleKey {
  kind: PossibleKeyKind
  line: number
}

// Never start or end inside an identifier, so a hyphenated order id or a
// trading pair can't present part of itself as a key.
const NOT_ID_BEFORE = "(?<![A-Za-z0-9_\\-])"
const NOT_ID_AFTER = "(?![A-Za-z0-9_\\-])"
const HEX64 = new RegExp(`${NOT_ID_BEFORE}(?:0x)?[0-9a-fA-F]{64}${NOT_ID_AFTER}`, "g")
// Base58 has no 0, O, I or l; a 64-byte secret encodes to 87–88 characters.
const B58_KEY = new RegExp(`${NOT_ID_BEFORE}[1-9A-HJ-NP-Za-km-z]{87,88}${NOT_ID_AFTER}`, "g")

// Each one becomes a warning for the reviewer; past this many, more say nothing new.
const MAX_POSSIBLE_KEYS = 20

export function findPossibleKeys(text: string): PossibleKey[] {
  const found: PossibleKey[] = []
  const lineAt = lineIndex(text)
  for (const [pattern, kind] of [
    [HEX64, "evm-hex64"],
    [B58_KEY, "solana-b58-64"],
  ] as const) {
    for (const match of text.matchAll(pattern)) found.push({ kind, line: lineAt(match.index ?? 0) })
  }
  // The first ones in the file, whichever kind
  return found.sort((a, b) => a.line - b.line).slice(0, MAX_POSSIBLE_KEYS)
}

export function describePossibleKey(key: PossibleKey): string {
  const what = key.kind === "evm-hex64" ? "64 hex characters" : "a long base58 value"
  return `Line ${key.line} carries ${what} that may be a private key — check it before approving (a tx hash or a digest is fine).`
}
