import Link from "next/link";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import "./docs.css";

/**
 * Markdown from the mkdocs content (already through lib/docs toMarkdown),
 * with links and images resolved by `resolve` and internal links as <Link>.
 */
export function MarkdownArticle({ body, resolve }: { body: string; resolve: (url: string) => string }) {
  return (
    <article className="prose-hb docs-prose max-w-3xl">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={{
          a: ({ href, children, id, className }) => {
            const url = href ? resolve(href) : href;
            const external = !!url && /^https?:\/\//.test(url);
            if (url && url.startsWith("/") && !url.startsWith("/docs-assets/")) {
              return (
                <Link href={url} id={id} className={className}>
                  {children}
                </Link>
              );
            }
            return (
              <a href={url} id={id} className={className} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
                {children}
              </a>
            );
          },
          img: ({ src, alt, className }) =>
            typeof src === "string" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolve(src)} alt={alt ?? ""} loading="lazy" className={className} />
            ) : null,
        }}
      >
        {body}
      </Markdown>
    </article>
  );
}
