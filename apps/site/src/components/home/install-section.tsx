import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InstallTabs } from "./install-tabs";

/** One-command installs for Condor and Hummingbot — the hero's "Install Condor" target. */
export function InstallSection() {
  return (
    <section id="install" className="w-full scroll-mt-16 border-b border-border py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Install</p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            One command to run your first agent.
          </h2>
          <p className="mb-6 text-base leading-relaxed text-muted-foreground md:text-lg">
            Condor runs your agents and talks to you on Telegram. Hummingbot is the open source engine underneath,
            with connectors to the exchanges you trade on.
          </p>
          <Link href="/get-started" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            Full guide: install, connect your exchange, first bot <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <InstallTabs
          tabs={[
            {
              id: "condor",
              label: "Condor",
              command: "curl -fsSL https://hummingbot.org/install-condor.sh | bash",
              comment: "# Telegram + AI trading agents (Condor + API, Docker).",
              icon: "phone",
              title: "AI harness for managing trading agents",
              description:
                "A Telegram-native interface backed by the Hummingbot API. Run and monitor AI trading agents and bots from your phone.",
            },
            {
              id: "hummingbot",
              label: "Hummingbot",
              command: "git clone https://github.com/hummingbot/hummingbot.git && cd hummingbot && make setup && make deploy",
              comment: "# Hummingbot Client in Docker. Then: make link-cli",
              icon: "code",
              title: "Core client and connectors",
              description:
                "The open source trading client — market making, arbitrage, and custom strategies across 50+ CEX and DEX connectors.",
            },
          ]}
        />
      </div>
    </section>
  );
}
