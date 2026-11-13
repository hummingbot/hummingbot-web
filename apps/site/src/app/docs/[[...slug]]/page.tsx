import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { cn } from "@hummingbot/ui";
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsToc } from "@/components/docs/docs-toc";
import "@/components/docs/docs.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { rehypeImageDimensions } from "@/lib/image-size";
import { getAllDocRoutes, getDocPage, getDocSections, locate, resolveDocUrl, DOCS_BASE } from "@/lib/docs";

type Params = { params: Promise<{ slug?: string[] }> };

export function generateStaticParams() {
  return getAllDocRoutes().map((route) => ({
    slug: route === DOCS_BASE ? [] : route.slice(DOCS_BASE.length + 1).split("/"),
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug = [] } = await params;
  const page = getDocPage(slug);
  if (!page) return {};
  return { title: `${page.title} — Hummingbot Docs` };
}

export default async function DocPage({ params }: Params) {
  const { slug = [] } = await params;
  const page = getDocPage(slug);
  if (!page) notFound();

  const sections = getDocSections();
  const { section, prev, next } = locate(page.route);

  return (
    <>
      <SiteHeader />

      {/* Section tabs, underlined like the header's active link */}
      <div className="border-b border-border">
        <nav aria-label="Docs sections" className="mx-auto flex max-w-[90rem] gap-6 overflow-x-auto px-6 lg:px-8">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              aria-current={s.id === section.id ? "true" : undefined}
              className={cn(
                "whitespace-nowrap py-3 text-sm font-medium transition-colors hover:text-primary",
                s.id === section.id
                  ? "text-foreground underline decoration-primary decoration-2 underline-offset-[14px]"
                  : "text-muted-foreground",
              )}
            >
              {s.title}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 gap-10 px-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-10 pr-2">
            <DocsSidebar nodes={section.nodes} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 py-10">
          <DocsMobileNav nodes={section.nodes} sectionTitle={section.title} />

          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            {section.title}
          </p>
          <h1 className="mb-8 text-balance text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {page.title}
          </h1>

          <article className="prose-hb docs-prose max-w-3xl">
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                rehypeRaw,
                rehypeSlug,
                [rehypeImageDimensions, { resolve: (src: string) => resolveDocUrl(page.file, src) }],
              ]}
              components={{
                a: ({ href, children, id, className }) => {
                  const url = href ? resolveDocUrl(page.file, href) : href;
                  const external = !!url && /^https?:\/\//.test(url);
                  if (url && url.startsWith("/") && !url.startsWith("/docs-assets/")) {
                    return <Link href={url} id={id} className={className}>{children}</Link>;
                  }
                  return (
                    <a href={url} id={id} className={className} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
                      {children}
                    </a>
                  );
                },
                // width/height/loading/fetchPriority come from rehypeImageDimensions.
                img: ({ src, alt, width, height, loading, fetchPriority, decoding }) =>
                  typeof src === "string" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveDocUrl(page.file, src)}
                      alt={alt ?? ""}
                      width={width}
                      height={height}
                      loading={loading ?? "lazy"}
                      fetchPriority={fetchPriority}
                      decoding={decoding}
                    />
                  ) : null,
              }}
            >
              {page.body}
            </Markdown>
          </article>

          <div className="mt-16 grid max-w-3xl gap-4 sm:grid-cols-2">
            {prev ? (
              <Link href={prev.href!} className="group rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous
                </span>
                <span className="mt-1 block font-semibold text-foreground">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={next.href!} className="group rounded-2xl border border-border bg-card p-5 text-right transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                  Next <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 block font-semibold text-foreground">{next.title}</span>
              </Link>
            )}
          </div>

          <a
            href={page.editUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <Pencil className="size-3.5" aria-hidden="true" /> Edit this page on GitHub
          </a>
        </main>

        <aside className="hidden w-56 shrink-0 xl:block">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-10">
            <DocsToc items={page.headings} />
          </div>
        </aside>
      </div>

      <SiteFooter />
    </>
  );
}
