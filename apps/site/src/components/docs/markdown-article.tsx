import Link from "next/link";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { rehypeImageDimensions } from "@/lib/image-size";
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
        rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeImageDimensions, { resolve }]]}
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
          // width/height/loading/fetchPriority come from rehypeImageDimensions.
          img: ({ src, alt, className, width, height, loading, fetchPriority, decoding }) =>
            typeof src === "string" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolve(src)}
                alt={alt ?? ""}
                width={width}
                height={height}
                loading={loading ?? "lazy"}
                fetchPriority={fetchPriority}
                decoding={decoding}
                className={className}
              />
            ) : null,
        }}
      >
        {body}
      </Markdown>
    </article>
  );
}
