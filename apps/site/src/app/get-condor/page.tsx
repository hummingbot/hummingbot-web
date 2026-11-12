import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, LayoutDashboard, Send, Wrench } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CondorInstall } from "@/components/condor/condor-install";
import { AFTER_INSTALL } from "@/components/condor/condor-steps";
import { urls } from "@/config/site";

export const metadata: Metadata = {
  title: "Get Condor — Hummingbot",
  description:
    "Install Condor, Hummingbot's app for running AI trading agents and bots on your own machine, then pull a strategy from the Hub.",
};

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

const WHAT = [
  { icon: Bot, title: "Run agents and bots", body: "Clone a strategy from the Hub, or let an agent run its own loop with dry-run first." },
  { icon: Send, title: "From Telegram", body: "Check your portfolio, trade and get alerts from your phone, through a bot only you control." },
  { icon: LayoutDashboard, title: "Or the web dashboard", body: "Trade panel, bots, agents and routines in the browser. /web in Telegram sends you a link." },
];

// From Condor's README: handy commands once it's installed.
const COMMANDS = [
  { cmd: "make status", what: "Is Condor up?" },
  { cmd: "make logs", what: "Live logs (Ctrl+B, then D to leave them running)" },
  { cmd: "make restart", what: "Stop and start again" },
  { cmd: "make doctor", what: "Re-check the install when something stops working (read-only)" },
];

/**
 * /get-condor — the one place for getting Condor: what it is, the installer for
 * your OS, what happens next, and how to pull your first agent. The Clone
 * dialog and the home's install section use the same CondorInstall.
 */
export default function CondorPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:py-20">
            <div>
              <p className={`${kicker} mb-4 inline-flex items-center gap-2 text-primary`}>
                <Image src="/brand/marks/condor-logo-square.png" alt="" width={20} height={20} className="rounded-full" />
                Condor · Open source
              </p>
              <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-6xl">
                Get Condor. <span className="brand-highlight text-primary">Run agents on your own keys.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Condor is the app that runs the strategies and agents you clone from the Hub. It installs on your own
                computer or server, so your exchange keys never leave it.
              </p>
              <ul className="mt-8 space-y-4">
                {WHAT.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-3">
                    <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <span className="font-semibold">{title}.</span>{" "}
                      <span className="text-muted-foreground">{body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div id="install" className="scroll-mt-20 rounded-2xl border border-border bg-card p-6 md:p-8">
              <p className={`${kicker} mb-2 text-primary`}>Install</p>
              <h2 className="mb-6 text-2xl font-bold tracking-tight">One command</h2>
              <CondorInstall />
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <p className={`${kicker} mb-3 text-primary`}>After the command</p>
            <h2 className="mb-10 text-3xl font-bold tracking-tight md:text-4xl">What happens next</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {AFTER_INSTALL.map((s, i) => (
                <li key={s.title} className="hub-card rounded-2xl border border-border bg-card p-6">
                  <span className="font-mono text-xs font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={urls.hub}
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Browse strategies to clone <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
              <Link
                href={`${urls.docs}/condor`}
                className="inline-flex h-12 items-center justify-center rounded-md border border-input px-6 font-medium hover:bg-muted"
              >
                Read the Condor docs
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:px-6 lg:grid-cols-2">
            <div>
              <p className={`${kicker} mb-3 flex items-center gap-2 text-primary`}>
                <Wrench className="size-3.5" aria-hidden="true" /> Already installed
              </p>
              <h2 className="mb-4 text-2xl font-bold tracking-tight">Handy commands</h2>
              <p className="mb-4 text-sm text-muted-foreground">Run them inside the condor/ folder.</p>
              <dl className="divide-y divide-border rounded-xl border border-border">
                {COMMANDS.map((c) => (
                  <div key={c.cmd} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <dt>
                      <code className="font-mono text-sm">{c.cmd}</code>
                    </dt>
                    <dd className="text-sm text-muted-foreground">{c.what}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <p className={`${kicker} mb-3 text-primary`}>Update</p>
              <h2 className="mb-4 text-2xl font-bold tracking-tight">Keep it current</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Run the same installer with <code className="font-mono">--upgrade</code> from the folder you installed
                in. It pulls the latest Condor, rebuilds it and refreshes its Docker images.
              </p>
              <div className="mt-4 rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 font-mono text-xs text-ink-100 md:text-sm">
                <span className="select-none text-ink-500">$ </span>
                curl -fsSL https://hummingbot.org/install-condor.sh | bash -s -- --upgrade
              </div>
              <a
                href="https://github.com/hummingbot/condor"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Condor on GitHub <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
