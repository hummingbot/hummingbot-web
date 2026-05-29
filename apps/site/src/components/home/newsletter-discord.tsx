import { ArrowRight, MessageCircle } from "lucide-react";
import { Card, Section } from "@hummingbot/ui";
import { urls } from "@/config/site";

export function NewsletterDiscord() {
  return (
    <Section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex flex-col justify-center p-8">
          <h3 className="text-2xl font-bold tracking-tight">Stay in the loop</h3>
          <p className="mt-2 text-sm text-ink-400 text-pretty">
            Releases, strategies, and market-making research. No spam.
          </p>
          {/* Substack handles signup + double opt-in. Embed is responsive so it
              never overflows the card on mobile. */}
          <iframe
            src="https://hummingbot.substack.com/embed?transparent=1&light=1"
            title="Subscribe to the Hummingbot newsletter on Substack"
            height={320}
            scrolling="no"
            className="mt-5 h-80 w-full max-w-[480px] border-0 bg-transparent"
          />
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
