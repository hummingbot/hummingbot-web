/**
 * Secrets in agent uploads. The risks: missing a phrase pasted the way
 * wallets and backup sheets write them, refusing ordinary prose or numbers,
 * and echoing the secret back in the refusal.
 */

import { describe, it, expect } from "vitest"
import { describePossibleKey, describeSecret, findPossibleKeys, findSecrets } from "./agent-secrets"
import { validateAgentPackage } from "./agent-package"

// BIP-39's own test vector, as Condor's contract (§6.3) uses it.
const PHRASE = "legal winner thank year wave sausage worth useful legal winner thank yellow"
const KEYPAIR = `[${Array.from({ length: 64 }, (_, i) => (i * 37) % 256).join(", ")}]`

describe("findSecrets", () => {
  it("finds a recovery phrase mid-sentence, numbered, one per line, or capitalised", () => {
    expect(findSecrets(`intro\nMy recovery phrase is: ${PHRASE}\n`)).toEqual([{ kind: "recovery-phrase", line: 2 }])
    const numbered = PHRASE.split(" ").map((w, i) => `${i + 1}. ${w}`).join(" ")
    expect(findSecrets(numbered)).toHaveLength(1)
    expect(findSecrets(PHRASE.split(" ").join("\n"))).toHaveLength(1)
    expect(findSecrets(`Legal ${PHRASE.slice(6)}`)).toHaveLength(1)
  })

  it("leaves eleven words and ordinary prose alone", () => {
    expect(findSecrets(PHRASE.split(" ").slice(0, 11).join(" "))).toEqual([])
    expect(
      findSecrets("Run the grid strategy with a volatility aware spread and rebalance when the price moves out of range."),
    ).toEqual([])
  })

  it("finds a 64-byte keypair array, and not 64 numbers that can't be bytes", () => {
    expect(findSecrets(`key = ${KEYPAIR}`)).toEqual([{ kind: "solana-keypair", line: 1 }])
    expect(findSecrets(KEYPAIR.replace("[0,", "[999,"))).toEqual([])
    expect(findSecrets(`[${Array(63).fill(1).join(",")}]`)).toEqual([])
  })

  it("finds provider-prefixed API keys and tokens", () => {
    // Built up so this file doesn't itself trip secret scanners.
    const keys = [
      "sk-" + "proj-" + "a1B2c3D4e5F6g7H8i9J0k1L2",
      "AKIA" + "IOSFODNN7Q3XPLE2",
      "ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8",
      "123456789:AA" + "F1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q",
    ]
    for (const key of keys) {
      expect(findSecrets(`# config\nclient = Client("${key}")\n`), key).toEqual([{ kind: "api-key", line: 2 }])
    }
  })

  it("finds keys in URLs and secret settings given a real value", () => {
    expect(findSecrets("rpc_url: https://mainnet.helius-rpc.com/?api-key=3f9a1c2b7d8e4f50a6b1")).toEqual([
      { kind: "credential", line: 1 },
    ])
    const evmKey = "0x" + "4c0883a69102937d6231471b5dbb6204fe512961708279f2d3e1c0b6a5f7e8d9"
    expect(findSecrets(`wallet:\n  private_key: ${evmKey}`)).toEqual([{ kind: "credential", line: 2 }])
    expect(findSecrets(`API_SECRET = "Zq81mK2pX7vN4cR9tL3wQ8"`)).toHaveLength(1)
    expect(findSecrets(`password: "hunter2hunter2hunter2"`)).toHaveLength(1)
  })

  it("leaves placeholders, code and bare hashes alone", () => {
    const fine = [
      "api_key: YOUR_API_KEY",
      'api_secret: ""',
      "secret_key: ${BINANCE_SECRET}",
      "password = config.password",
      'api_key = os.getenv("BINANCE_API_KEY")',
      "private_key: <your-private-key>",
      "tx: 0x4c0883a69102937d6231471b5dbb6204fe512961708279f2d3e1c0b6a5f7e8d9",
      "Set your API key in the Condor credentials screen.",
      "AWS documents AKIA" + "IOSFODNN7EXAMPLE as its example key.",
      "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m",
      // A token's mint in a DEX or price API query is an address, not a key.
      "https://api.dexscreener.com/tokens?token=So11111111111111111111111111111111111111112",
      // An account name, not a key: values under 20 characters pass.
      "api_key: binance_main_2",
    ]
    for (const text of fine) expect(findSecrets(text), text).toEqual([])
  })

  it("never puts the secret in the message", () => {
    const message = describeSecret({ kind: "recovery-phrase", line: 9 })
    expect(message).toMatch(/Line 9/)
    for (const word of new Set(PHRASE.split(" "))) expect(message).not.toMatch(new RegExp(`\\b${word}\\b`))
  })
})

const HEX64 = "4c0883a69102937d6231471b5dbb6204fe512961708279f1b7e0f4e6a6b01f4c"
const B58 = "9dwtq5H8YqVXiRsE7Y2zvRUfqr1mVJotFe7zM222ib1yRkEUo2aFqVYcFPFkFqWK2Tvci7ChoxK8pNzonZUZvjDL"

describe("possible keys (SEC review C2)", () => {
  it("finds a bare 64-hex and a long base58, by line", () => {
    expect(findPossibleKeys(`TX = "${HEX64}"\nnote\nsol = "${B58}"\n`)).toEqual([
      { kind: "evm-hex64", line: 1 },
      { kind: "solana-b58-64", line: 3 },
    ])
  })

  it("leaves shorter hex, addresses and identifiers alone", () => {
    const fine = [
      "0x" + "ab".repeat(20), // an EVM address
      "a".repeat(63),
      `order-${HEX64}`, // inside an identifier
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", // a Solana address
    ]
    for (const text of fine) expect(findPossibleKeys(text), text).toEqual([])
  })

  it("tells the reviewer where to look, never what it found", () => {
    const message = describePossibleKey({ kind: "evm-hex64", line: 4 })
    expect(message).toMatch(/Line 4 .*may be a private key — check it before approving/)
  })
})

describe("in the structure check", () => {
  it("refuses an upload carrying a recovery phrase, naming the file and line", () => {
    const report = validateAgentPackage([
      { path: "AGENT.md", content: Buffer.from("---\nname: a\n---\n") },
      { path: "skills/s/SKILL.md", content: Buffer.from(`---\nname: s\n---\nMy phrase: ${PHRASE}\n`) },
    ])
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.errors).toEqual([{ path: "skills/s/SKILL.md", message: expect.stringMatching(/^Line 4 .*BIP-39/) }])
    expect(JSON.stringify(report)).not.toContain("sausage")
  })
})

// Security review 2026-11: line numbers were found by counting from the start
// for every match, quadratic on a file full of key-like values.
describe("findPossibleKeys on hostile input", () => {
  const hexLine = (i: number) => i.toString(16).padStart(64, "0")
  const text = Array.from({ length: 15_000 }, (_, i) => hexLine(i)).join("\n")

  it("handles a megabyte of hex lines quickly", () => {
    const started = performance.now()
    findPossibleKeys(text)
    expect(performance.now() - started).toBeLessThan(1000)
  })

  it("reports the first few with correct line numbers, not thousands", () => {
    const keys = findPossibleKeys(text)
    expect(keys).toHaveLength(20)
    expect(keys.slice(0, 3).map((k) => k.line)).toEqual([1, 2, 3])
  })

  it("gives the right line for a secret far down a file", () => {
    const lines = Array.from({ length: 500 }, () => "x = 1")
    lines[399] = 'API_SECRET = "a1b2c3d4e5f6g7h8i9j0k1l2"'
    expect(findSecrets(lines.join("\n"))[0].line).toBe(400)
  })

  it("reports the earliest keys of any kind once there are more than it lists", () => {
    const b58 = "4".repeat(88)
    const keys = findPossibleKeys(`${b58}\n${text}`)
    expect(keys[0]).toEqual({ kind: "solana-b58-64", line: 1 })
  })
})
