import { ArrowUpRight } from "lucide-react";
import { urls } from "@/config/site";

/**
 * Education on the home: Botcamp, Hummingbot's training and certification
 * program (botcamp.xyz for now). A teal-tinted band, as the unified site's
 * Botcamp section.
 */
export function EducationSection() {
  return (
    <section id="education" className="relative w-full scroll-mt-16 overflow-hidden border-b border-border py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 78% 30%, hsl(var(--primary) / 0.14), transparent 70%), radial-gradient(ellipse 50% 60% at 10% 100%, hsl(var(--primary) / 0.05), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Education
          </p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
            Learn market making with Botcamp.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            Botcamp certification shows you can build, backtest, and deploy custom strategies on the Hummingbot V2
            framework. Certified developers can publish in the Strategy Library.
          </p>
          <a
            href={urls.education}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Explore Botcamp <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
