import { NextResponse } from "next/server";

/**
 * Adds an email to the Resend audience. Requires RESEND_API_KEY +
 * RESEND_AUDIENCE_ID. Returns a clear error if unconfigured — no silent
 * success, no fake confirmation.
 */
export async function POST(req: Request) {
  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    // Keep the technical detail server-side; show users a friendly message.
    console.warn("[newsletter] Resend not configured (RESEND_API_KEY / RESEND_AUDIENCE_ID missing)");
    return NextResponse.json(
      { error: "Subscriptions are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, unsubscribed: false }),
  });

  if (!res.ok) {
    console.error(`[newsletter] Resend error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return NextResponse.json(
      { error: "Couldn't subscribe right now. Please try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
