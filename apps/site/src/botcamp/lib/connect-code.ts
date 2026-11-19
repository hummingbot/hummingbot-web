import { createHash, randomInt } from "crypto"
import { prisma } from "@/botcamp/lib/prisma"
import { rateLimit } from "@/botcamp/lib/rate-limit"
import {
  ALL_SCOPES,
  MAX_API_TOKENS_PER_USER,
  activeApiTokenWhere,
  generateApiToken,
} from "@/botcamp/lib/api-tokens"

// "Connect Botcamp" with a code Botcamp gives: the signed-in person generates
// it on /connect, pastes it into Condor, and Condor redeems it once
// (POST /api/condor/connect-code/redeem) for an ordinary ApiToken — the one
// Condor then uses for everything, consent included. It replaced the device
// flow, where Condor showed a code that was typed here.
//
// The code is a bearer secret for ten minutes: whoever redeems it first gets
// the token. So it's short-lived, single-use, one live per person, stored
// hashed, guessing it is rate-limited per IP, and the person is emailed when
// it's redeemed.

export const CONNECT_CODE_TTL_SECONDS = 10 * 60

// Generating, per person. /connect makes one each time it opens, so this
// leaves room for a few reloads; a real connect takes one.
export const MAX_CODES_PER_USER = 10
export const CODE_WINDOW_SECONDS = 10 * 60

// Redeeming needs no account, so it's capped per IP to stop guessing. 12
// letters from 20 is ~52 bits; at this rate guessing one is out of reach.
export const MAX_REDEEMS_PER_IP = 10
export const REDEEM_WINDOW_SECONDS = 10 * 60

// No vowels (no accidental words) and no letters that read alike.
const ALPHABET = "BCDFGHJKLMNPQRSTVWXZ"
const LENGTH = 12

/** "bcdf-ghjk-lmnp" style input → "BCDFGHJKLMNP"; null when it can't be a code. */
export function normalizeConnectCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z]/g, "")
  if (code.length !== LENGTH) return null
  return [...code].every((c) => ALPHABET.includes(c)) ? code : null
}

export function formatConnectCode(code: string): string {
  return code.match(/.{1,4}/g)!.join("-")
}

export function hashConnectCode(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex")
}

function generateCode(): string {
  return Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")
}

export type CreateResult =
  | { ok: true; code: string; expiresAt: Date }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number }

// The signed-in person asks for a code. Any earlier unused one stops working,
// so only the code on screen is live.
export async function createConnectCode(userId: string): Promise<CreateResult> {
  const limited = await rateLimit(`condor-connect-code:${userId}`, MAX_CODES_PER_USER, CODE_WINDOW_SECONDS * 1000)
  if (!limited.ok) {
    return {
      ok: false,
      status: 429,
      error: "Too many codes — wait a few minutes and try again",
      retryAfterSeconds: limited.retryAfterSeconds,
    }
  }

  const count = await prisma.apiToken.count({ where: activeApiTokenWhere(userId) })
  if (count >= MAX_API_TOKENS_PER_USER) {
    return {
      ok: false,
      status: 400,
      error: `You have ${MAX_API_TOKENS_PER_USER} Condor connections already — disconnect one in your profile's Condor tab first`,
    }
  }

  const now = new Date()
  await prisma.condorConnectCode.deleteMany({
    where: { OR: [{ userId, usedAt: null }, { expiresAt: { lt: now } }] },
  })

  const expiresAt = new Date(now.getTime() + CONNECT_CODE_TTL_SECONDS * 1000)
  // A clash is astronomically unlikely, but retry rather than 500.
  for (let attempt = 0; ; attempt++) {
    const code = generateCode()
    try {
      await prisma.condorConnectCode.create({
        data: { codeHash: hashConnectCode(code), userId, scopes: ALL_SCOPES, expiresAt },
      })
      return { ok: true, code: formatConnectCode(code), expiresAt }
    } catch (error) {
      if ((error as { code?: string }).code === "P2002" && attempt < 2) continue
      throw error
    }
  }
}

export type RedeemResult =
  | { ok: true; token: string; scopes: string[]; expiresAt: Date; user: { id: string; name: string } }
  | { ok: false; error: "invalid_grant" | "too_many_connections" }

// Condor trades the code for a token. The token is created here, so its
// plaintext only ever exists in this response; usedAt is set with a
// conditional update so two racing redeems can't both mint one. A wrong,
// used or expired code all answer the same, so a guess learns nothing.
export async function redeemConnectCode(
  input: string,
  clientName: string,
  redeemerIp: string | null,
): Promise<RedeemResult> {
  const normalized = normalizeConnectCode(input)
  if (!normalized) return { ok: false, error: "invalid_grant" }

  const row = await prisma.condorConnectCode.findUnique({
    where: { codeHash: hashConnectCode(normalized) },
    select: { id: true, userId: true, scopes: true, expiresAt: true, usedAt: true },
  })
  if (!row || row.usedAt || row.expiresAt < new Date()) return { ok: false, error: "invalid_grant" }

  const claimed = await prisma.condorConnectCode.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date(), redeemerIp },
  })
  if (claimed.count === 0) return { ok: false, error: "invalid_grant" }

  const count = await prisma.apiToken.count({ where: activeApiTokenWhere(row.userId) })
  if (count >= MAX_API_TOKENS_PER_USER) return { ok: false, error: "too_many_connections" }

  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { id: true, firstName: true, lastName: true, email: true },
  })
  if (!user) return { ok: false, error: "invalid_grant" }

  const { token, tokenHash, prefix, expiresAt } = generateApiToken()
  await prisma.apiToken.create({
    data: { userId: user.id, name: clientName, tokenHash, prefix, scopes: row.scopes, expiresAt },
  })
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
  return { ok: true, token, scopes: row.scopes, expiresAt, user: { id: user.id, name } }
}
