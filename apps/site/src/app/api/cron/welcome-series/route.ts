import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { sendWelcomeDripEmail, WELCOME_DRIP_STEPS } from "@/botcamp/lib/notifications"

// Runs once a day (see vercel.json). For each drip step, a user falls into
// that step's 24h window based on days-since-signup, not a calendar date —
// so this stays correct even if the cron fires a bit early/late day to day.
export async function GET(request: NextRequest) {
  // This route is reachable by anyone on the internet (Vercel Cron hits it
  // over plain HTTP, so it can't sit behind session auth) — fail closed if
  // CRON_SECRET isn't configured, unlike the Stripe webhook's dev-only
  // bypass. There's no legitimate reason to run this unauthenticated in any
  // environment, including local dev (set any value in .env.local).
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("CRON_SECRET not set - refusing to run welcome-series cron")
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const results: Record<number, { matched: number; sent: number }> = {}

  for (const { day, notificationType } of WELCOME_DRIP_STEPS) {
    // 48h window: each user is matched by two consecutive daily runs, so a
    // single missed cron day can't permanently skip a step. The
    // notifications:{none} filter below (plus the stable idempotency key in
    // sendWelcomeDripEmail) keeps the second match from double-sending.
    const windowStart = new Date(now - (day + 2) * dayMs)
    const windowEnd = new Date(now - day * dayMs)

    const users = await prisma.user.findMany({
      where: {
        createdAt: { gte: windowStart, lt: windowEnd },
        emailMarketing: true,
        notifications: {
          none: {
            OR: [
              { type: notificationType }, // already received this step
              { bouncedAt: { not: null } }, // any prior bounce halts the series
            ],
          },
        },
      },
      select: { id: true },
    })

    let sent = 0
    for (const user of users) {
      const result = await sendWelcomeDripEmail(user.id, day)
      if (result?.success) sent++
    }

    results[day] = { matched: users.length, sent }
  }

  console.log("Welcome series cron run:", results)
  return NextResponse.json({ ok: true, results })
}
