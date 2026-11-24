import { ArrowRight, ArrowUpRight, BadgeCheck } from "lucide-react";
import { urls } from "@/config/site";
import { getLibraryStrategies } from "@/lib/strategy-library";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

/**
 * Strategies on the home: Botcamp's Strategy Library, where strategies and
 * agents are validated and clone into Condor. Three real ones from its public
 * catalogue, then the way to the rest.
 */
export async function StrategiesSection() {
  const strategies = await getLibraryStrategies(3);

  return (
    <section id="strategies" className="w-full scroll-mt-16 border-b border-border py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className={`${kicker} mb-4 text-muted-foreground`}>Strategy Library</p>
            <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
              Strategies, ready to run.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Market making strategies and AI agents from the community, validated and ready to clone into Condor.
            </p>
          </div>
          <a
            href={urls.strategyLibrary}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse the library <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        {strategies.length > 0 && (
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {strategies.map((s) => (
              <li key={s.slug}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hub-card group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-foreground">
                      <BadgeCheck className="size-3.5" aria-hidden="true" /> Validated
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {s.free ? "Free" : "Members"}
                      <ArrowUpRight
                        className="size-4 transition-colors group-hover:text-foreground"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                  <span className="mt-5 text-xl font-semibold leading-snug tracking-tight">{s.name}</span>
                  {s.description && (
                    <span className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {s.description}
                    </span>
                  )}
                  {s.author && <span className="mt-5 text-xs text-muted-foreground">by {s.author}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
