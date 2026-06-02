import { ArrowRight, Github, Star } from "lucide-react";
import { Button, GradientText } from "@hummingbot/ui";
import { announcement, urls } from "@/config/site";
import { formatStars, getRepoStars } from "@/lib/github";
import { InstallTabs } from "./install-tabs";

export async function Hero() {
  const hbStars = await getRepoStars("hummingbot");

  return (
    <section className="relative overflow-hidden">
      {/* brand gradient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[480px] max-w-4xl rounded-full bg-gradient-to-r from-brand-teal/20 via-brand-cyan/10 to-brand-magenta/20 blur-3xl"
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pb-20 pt-20 text-center sm:pt-28">
        <a
          href={announcement.href}
          className="group inline-flex items-center gap-2 rounded-full border border-ink-800 bg-ink-900/60 px-4 py-1.5 text-sm text-ink-300 transition-colors hover:border-ink-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-pretty">{announcement.text}</span>
          <ArrowRight
            className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </a>
        <h1 className="max-w-4xl text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          The open source framework for{" "}
          <GradientText>agentic trading strategies</GradientText>
        </h1>
        <p className="max-w-2xl text-pretty text-lg text-ink-400 sm:text-xl">
          Build, deploy, and run self-hosted trading bots and AI agents across
          50+ exchanges. Open source. Battle-tested. Yours to command.
        </p>

        <InstallTabs
          tabs={[
            {
              id: "condor",
              label: "Condor",
              command:
                "curl -fsSL https://hummingbot.org/install-condor.sh | bash",
              comment: "# Telegram + AI trading agents (Condor + API, Docker).",
              icon: "phone",
              title: "AI harness for managing trading agents",
              description:
                "A Telegram-native interface backed by the Hummingbot API. Run and monitor AI trading agents and bots from your phone — no terminal required.",
            },
            {
              id: "hummingbot",
              label: "Hummingbot",
              command:
                "curl -fsSL https://hummingbot.org/install-hummingbot.sh | bash",
              comment:
                "# Installs Hummingbot, then asks how you want to run it.",
              channels: true,
              icon: "code",
              title: "Core client and connectors",
              description:
                "The open-source trading client — market-making, arbitrage, and custom strategies across 50+ CEX and DEX connectors, self-hosted on your own machine.",
            },
          ]}
        />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href={urls.docs} target="_blank" rel="noreferrer">
            <Button size="lg">
              Read the Docs <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </a>
          <a href={urls.github} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline">
              <Github className="size-4" aria-hidden="true" />
              View on GitHub
              {hbStars != null && (
                <span className="ml-1 inline-flex items-center gap-1 tabular-nums text-ink-400">
                  <Star className="size-3.5 fill-current" aria-hidden="true" />
                  {formatStars(hbStars)}
                </span>
              )}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
