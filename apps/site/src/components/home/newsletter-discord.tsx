"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button, Card, Section } from "@hummingbot/ui";
import { urls } from "@/config/site";

type Status = { state: "idle" | "loading" | "ok" | "error"; message?: string };

export function NewsletterDiscord() {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col justify-center p-8">
          <h3 className="text-2xl font-bold tracking-tight">Stay in the loop</h3>
          <p className="mt-2 text-sm text-ink-400 text-pretty">
            Releases, strategies, and market-making research. No spam.
          </p>
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
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
              placeholder="you@example.com…"
              className="h-10 flex-1 rounded-md border border-ink-700 bg-ink-950 px-3 text-sm text-foreground placeholder:text-ink-600 focus-visible:border-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" disabled={status.state === "loading"}>
              {status.state === "loading" ? "Subscribing…" : "Subscribe"}
            </Button>
          </form>
          <p
            aria-live="polite"
            className={`mt-3 min-h-5 text-sm ${
              status.state === "error" ? "text-bear" : "text-brand-teal"
            }`}
          >
            {status.message}
          </p>
        </Card>

        <a
          href={urls.discord}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex h-full flex-col justify-center p-8 transition-colors group-hover:border-ink-700">
            <MessageCircle className="size-7 text-brand-magenta" aria-hidden="true" />
            <h3 className="mt-4 text-2xl font-bold tracking-tight">
              Join the community
            </h3>
            <p className="mt-2 text-sm text-ink-400 text-pretty">
              Thousands of traders and builders in Discord — get help, share
              strategies, shape the roadmap.
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-teal">
              Open Discord <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </Card>
        </a>
      </div>
    </Section>
  );
}
