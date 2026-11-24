import Link from "next/link";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import { cn } from "@hummingbot/ui";
import { DocsToc } from "@/components/docs/docs-toc";
import { MarkdownArticle } from "@/components/docs/markdown-article";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketDepthBackground } from "@/components/ui/market-depth-background";
import { getSectionPage, resolveSectionUrl, sectionPageHref } from "@/lib/sections";
import "./sections.css";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

type Loaded = NonNullable<ReturnType<typeof getSectionPage>>;

/**
 * A Hummingbot section page (Foundation, Bounties) in the site's design: a
 * hero on the landing page, tabs for the section's pages, then the prod
 * content with its "On this page" outline and previous/next.
 */
export function SectionPageView({ loaded }: { loaded: Loaded }) {
  const { section, def, doc, prev, next } = loaded;
  const landing = def.slug === "";
  const resolve = (url: string) => resolveSectionUrl(doc, url);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="relative w-full overflow-hidden border-b border-border">
          {landing && <MarketDepthBackground seed={section.id === "foundation" ? 3 : 17} opacity={0.45} />}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/85 to-background/30"
          />
          <div className={cn("relative z-20 mx-auto max-w-7xl px-4 md:px-6", landing ? "pb-10 pt-16 md:pt-24" : "pb-8 pt-12")}>
            <p className={`${kicker} mb-4 text-primary`}>{section.kicker}</p>
            {landing ? (
              <>
                <h1 className="max-w-4xl text-balance text-5xl font-bold leading-[1.08] tracking-[-0.04em] md:text-7xl">
                  {section.title.lead}{" "}
                  <span className="brand-highlight text-primary">{section.title.highlight}</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                  {section.tagline}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {section.actions.map((a) => (
                    <a
                      key={a.label}
                      href={a.href}
                      {...(/^https?:/.test(a.href) ? { target: "_blank", rel: "noreferrer" } : {})}
                      className={cn(
                        "inline-flex h-12 items-center justify-center rounded-md px-6 text-base font-semibold transition-colors",
                        a.primary
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-input bg-background/60 hover:bg-muted",
                      )}
                    >
                      {a.label}
                      {a.primary && <ArrowRight className="ml-2 size-4" aria-hidden="true" />}
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <h1 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">{def.title}</h1>
            )}

            {/* Section tabs */}
            <nav aria-label={section.kicker} className="mt-10 flex gap-2 overflow-x-auto pb-1">
              {section.pages.map((p) => {
                const href = sectionPageHref(section, p);
                const active = p.slug === def.slug;
                return (
                  <Link
                    key={p.slug || "index"}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {p.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-7xl gap-12 px-4 py-12 md:px-6 md:py-16">
          <div className="min-w-0 flex-1">
            <MarkdownArticle body={doc.body} resolve={resolve} />

            <div className="mt-16 grid max-w-3xl gap-4 sm:grid-cols-2">
              {prev ? (
                <Link
                  href={sectionPageHref(section, prev)}
                  className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous
                  </span>
                  <span className="mt-1 block font-semibold">{prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={sectionPageHref(section, next)}
                  className="rounded-2xl border border-border bg-card p-5 text-right transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    Next <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block font-semibold">{next.title}</span>
                </Link>
              )}
            </div>

            <a
              href={doc.editUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden="true" /> Edit this page on GitHub
            </a>
          </div>

          <aside className="hidden w-56 shrink-0 xl:block">
            <div className="sticky top-24">
              <DocsToc items={doc.headings} />
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
