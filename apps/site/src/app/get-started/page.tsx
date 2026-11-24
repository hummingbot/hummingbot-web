import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, FileText } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GuideBlocks } from "@/components/get-started/guide-blocks";
import { AskAi, ForPath, GuideProvider, PathBadge, PathChooser } from "@/components/get-started/guide-client";
import { GUIDE, NEXT_STEPS, SITE_URL, STEPS } from "@/lib/get-started";

export const metadata: Metadata = {
  title: "Get started with Hummingbot",
  description:
    "Install Hummingbot and run your first trading bot: requirements, install, connecting your exchange, your first bot, updating, uninstalling and troubleshooting, for Condor and the Hummingbot Client.",
  alternates: {
    canonical: "/get-started",
    types: { "text/markdown": "/get-started.md" },
  },
};

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Hummingbot",
  applicationCategory: "FinanceApplication",
  operatingSystem: "macOS, Linux, Windows (WSL2)",
  description: GUIDE.summary,
  url: `${SITE_URL}/get-started`,
  downloadUrl: "https://github.com/hummingbot/hummingbot",
  license: "https://www.apache.org/licenses/LICENSE-2.0",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

/**
 * /get-started — everything a new user needs to go from nothing to a running
 * Hummingbot bot, on one page, for both ways of using it (Condor or the
 * Client). Content lives in lib/get-started.ts, which also feeds
 * /get-started.md for AI assistants.
 */
export default function GetStartedPage() {
  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GuideProvider>
        <main className="flex-1">
          <section className="border-b border-border">
            <div className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
              <p className={`${kicker} mb-4 text-primary`}>Get started</p>
              <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-6xl">
                From zero to your first <span className="brand-highlight text-primary">Hummingbot</span> bot.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">{GUIDE.summary}</p>
              <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
                Everything you need is on this page: what to install, how to connect your exchange, how to run your
                first bot, and what to do if something goes wrong.
              </p>

              <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Bot className="size-4 text-primary" aria-hidden="true" /> Using an AI assistant? Give it this guide.
                </p>
                <AskAi />
                <p className="mt-3 text-xs text-muted-foreground">
                  Plain-text version for AI tools:{" "}
                  <a href="/get-started.md" className="font-mono text-primary hover:underline">
                    hummingbot.org/get-started.md
                  </a>
                </p>
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
            <aside className="hidden lg:block">
              <nav aria-label="On this page" className="sticky top-24 space-y-4 text-sm">
                <PathBadge />
                <ol className="space-y-2">
                  <li>
                    <a href="#choose" className="text-muted-foreground hover:text-foreground">
                      Choose how
                    </a>
                  </li>
                  {STEPS.map((s, i) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
                        <span className="mr-1.5 font-mono text-xs text-primary">{i + 1}</span>
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <div className="min-w-0 space-y-16">
              <section id="choose" className="scroll-mt-24">
                <h2 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">Choose how you&apos;ll use it</h2>
                <p className="mb-6 text-muted-foreground">
                  Both run the same Hummingbot engine, and you can switch later. The steps below follow your choice.
                </p>
                <PathChooser />
                <p className="mt-4 text-sm text-muted-foreground">
                  Building your own app on top of Hummingbot? See the{" "}
                  <Link href="/docs/hummingbot-api" className="font-medium text-primary hover:underline">
                    Hummingbot API
                  </Link>
                  . Trading on decentralized exchanges? See{" "}
                  <Link href="/docs/gateway" className="font-medium text-primary hover:underline">
                    Gateway
                  </Link>
                  .
                </p>
              </section>

              {STEPS.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="mb-5 flex items-baseline gap-3 text-2xl font-bold tracking-tight md:text-3xl">
                    <span className="font-mono text-base font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </h2>
                  <div className="space-y-4">
                    <GuideBlocks blocks={s.intro} />
                    {s.condor && (
                      <ForPath path="condor">
                        <div className="space-y-4">
                          <GuideBlocks blocks={s.condor} />
                        </div>
                      </ForPath>
                    )}
                    {s.client && (
                      <ForPath path="client">
                        <div className="space-y-4">
                          <GuideBlocks blocks={s.client} />
                        </div>
                      </ForPath>
                    )}
                    <GuideBlocks blocks={s.outro} />
                  </div>
                </section>
              ))}

              <section id="next" className="scroll-mt-24">
                <h2 className="mb-5 text-2xl font-bold tracking-tight md:text-3xl">What&apos;s next</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {NEXT_STEPS.map((n) => (
                    <li key={n.label}>
                      <Link
                        href={n.href}
                        className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                      >
                        <span className="flex items-center justify-between font-semibold">
                          {n.label}
                          <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                        <span className="mt-1 text-sm text-muted-foreground">{n.body}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="size-3.5" aria-hidden="true" />
                  Something missing or wrong in this guide? Tell us in{" "}
                  <a href="https://discord.gg/hummingbot" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Discord
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </main>
      </GuideProvider>
      <SiteFooter />
    </>
  );
}
