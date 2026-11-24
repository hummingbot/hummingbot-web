/**
 * Discord OAuth2 + bot API helpers for the hackathon private-channel badge.
 * Flow: user authorizes via Discord OAuth (identify) -> we exchange the code
 * for their Discord user id -> if they're already a member of the guild, the
 * bot grants DISCORD_HACKATHON_ROLE_ID directly. We deliberately don't
 * auto-join them (that needs the bot's CREATE_INSTANT_INVITE permission on
 * top of MANAGE_ROLES) — if they're not a member yet we ask them to use the
 * public invite first, then retry.
 */

const DISCORD_API = "https://discord.com/api/v10"

export const DISCORD_STATE_COOKIE = "discord_oauth_nonce"

export function getDiscordRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base}/api/discord/callback`
}

export function getDiscordAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: getDiscordRedirectUri(),
    response_type: "code",
    scope: "identify",
    state,
    prompt: "none",
  })
  return `https://discord.com/oauth2/authorize?${params.toString()}`
}

interface DiscordTokenResponse {
  access_token: string
  token_type: string
}

export async function exchangeDiscordCode(code: string): Promise<DiscordTokenResponse> {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: getDiscordRedirectUri(),
    }),
  })

  if (!res.ok) {
    throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`)
  }

  return res.json()
}

export async function getDiscordUser(accessToken: string): Promise<{ id: string; username: string }> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status} ${await res.text()}`)
  }

  return res.json()
}

/**
 * Grants the badge role if the user is already a guild member. Returns
 * "not_member" (rather than throwing) if they haven't joined the Discord
 * server yet — the caller should send them to the public invite instead.
 */
export async function grantHackathonDiscordRole(
  discordUserId: string
): Promise<"granted" | "not_member"> {
  const guildId = process.env.DISCORD_GUILD_ID!
  const roleId = process.env.DISCORD_HACKATHON_ROLE_ID!
  const botAuth = `Bot ${process.env.DISCORD_BOT_TOKEN!}`

  const memberRes = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}`, {
    headers: { Authorization: botAuth },
  })

  if (memberRes.status === 404) return "not_member"
  if (!memberRes.ok) {
    throw new Error(`Discord member lookup failed: ${memberRes.status} ${await memberRes.text()}`)
  }

  const roleRes = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
    method: "PUT",
    headers: { Authorization: botAuth },
  })
  if (!roleRes.ok) {
    throw new Error(`Discord role grant failed: ${roleRes.status} ${await roleRes.text()}`)
  }

  return "granted"
}
