"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Github, Mail, MessageCircle, Send, Twitter, Youtube } from "lucide-react";
import { urls } from "@/config/site";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

const CHANNELS = [
  {
    Icon: MessageCircle,
    name: "Discord",
    body: "The main hub: support, strategy and connector help, dev chat, and announcements.",
    cta: "Join the server",
    href: urls.discord,
  },
  {
    Icon: Send,
    name: "Telegram",
    body: "Questions about Botcamp cohorts before you enroll, answered by the team.",
    cta: "Ask about cohorts",
    href: urls.telegram,
  },
  {
    Icon: Youtube,
    name: "YouTube",
    body: "Tutorials, Demo Days, and The Bot Pod, the weekly podcast with the maintainers.",
    cta: "Watch",
    href: urls.youtube,
  },
  {
    Icon: Twitter,
    name: "X",
    body: "Releases, hackathon results, and community news as they happen.",
    cta: "Follow",
    href: urls.x,
  },
  {
    Icon: Github,
    name: "GitHub",
    body: "The open source code. Contribute connectors and fixes, and get paid in bounties.",
    cta: "Contribute",
    href: urls.github,
    secondary: { label: "See bounties", href: "/bounties" },
  },
] as const;

type Status = { state: "idle" | "loading" | "ok" | "error"; message?: string };

/** Where the community meets, and the monthly newsletter. */
export function CommunitySection() {
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
    <section id="community" className="w-full scroll-mt-16 border-b border-border py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        {/* Pitch and newsletter */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className={`${kicker} mb-3 text-muted-foreground`}>Community</p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
            Where traders and builders meet.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            Hummingbot is built in the open by a global community. Ask, share strategies, and shape the roadmap.
          </p>

          <form onSubmit={onSubmit} className="mt-10 max-w-md">
            <label htmlFor="community-email" className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Mail className="size-4" aria-hidden="true" /> The monthly newsletter
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="community-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                spellCheck={false}
                placeholder="you@example.com"
                className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={status.state === "loading"}
                className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {status.state === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
            <p
              aria-live="polite"
              className={`mt-2 min-h-5 text-xs ${status.state === "error" ? "text-bear" : "text-muted-foreground"}`}
            >
              {status.message ?? "Releases, new strategies, cohorts, and hackathons. One email a month."}
            </p>
          </form>
        </div>

        {/* Channels */}
        <ul className="divide-y divide-border border-y border-border">
          {CHANNELS.map(({ Icon, name, body, cta, href, ...rest }) => (
            <li key={name} className="group relative flex items-start gap-5 py-6">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${name}: ${cta}`}
                className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">{name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                {"secondary" in rest && rest.secondary && (
                  <Link
                    href={rest.secondary.href}
                    // mt-1 + py-1 - mb-1: the text sits where mt-2 put it, in a 24px+ hit area.
                    className="relative z-10 -mb-1 mt-1 inline-block py-1 text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-muted-foreground"
                  >
                    {rest.secondary.label}
                  </Link>
                )}
              </div>
              <span className="hidden shrink-0 items-center gap-1 self-center text-sm font-semibold sm:inline-flex">
                {cta}
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
