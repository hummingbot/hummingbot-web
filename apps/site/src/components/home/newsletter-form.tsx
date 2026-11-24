"use client";

import { useState, type FormEvent } from "react";

type Status = { state: "idle" | "loading" | "ok" | "error"; message?: string };

/** Email signup for the newsletter (POST /api/subscribe, a Resend audience). */
export function NewsletterForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get("email");
    setStatus({ state: "loading" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus({ state: "error", message: data.error ?? "Something went wrong." });
        return;
      }
      form.reset();
      setStatus({ state: "ok", message: "Check your inbox to confirm." });
    } catch {
      setStatus({ state: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          spellCheck={false}
          placeholder="you@example.com"
          className="h-12 flex-1 rounded-md border border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={status.state === "loading"}
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {status.state === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      <p
        aria-live="polite"
        className={`mt-3 min-h-5 text-sm ${status.state === "error" ? "text-destructive" : "text-muted-foreground"}`}
      >
        {status.message}
      </p>
    </form>
  );
}
