import { ArrowRight } from "lucide-react";
import { exchanges } from "@hummingbot/brand";
import { Section } from "@hummingbot/ui";
import { urls } from "@/config/site";

export function ExchangeGrid() {
  return (
    <Section>
      <div className="mb-12 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Trade across 50+ exchanges
        </h2>
        <p className="mt-3 text-pretty text-ink-400">
          Centralized, decentralized, spot, and perps — one framework, every
          venue.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {exchanges.map((ex) => (
          <li key={ex.name}>
            <a
              href={urls.exchanges}
              className="flex h-20 items-center justify-center rounded-xl border border-ink-800 bg-card transition-colors hover:border-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/brand/logos/${ex.dark}`}
                alt={ex.name}
                height={24}
                className="h-6 w-auto max-w-[70%] opacity-70 grayscale transition group-hover:opacity-100"
                loading="lazy"
              />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <a
          href={urls.exchanges}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
        >
          View all exchanges <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </Section>
  );
}
