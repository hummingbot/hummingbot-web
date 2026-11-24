import Link from "next/link";
import { Fragment } from "react";
import { AlertTriangle, ChevronDown, Lightbulb } from "lucide-react";
import { CopyButton } from "@hummingbot/ui";
import type { Block } from "@/lib/get-started";
import { OsTabs } from "./guide-client";

const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

/** Renders the guide's inline Markdown subset: `code`, **bold**, [text](url). */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1)
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
              {part.slice(1, -1)}
            </code>
          );
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const [, label, href] = link;
          const cls = "font-medium text-primary underline-offset-2 hover:underline";
          return href.startsWith("/") ? (
            <Link key={i} href={href} className={cls}>
              {label}
            </Link>
          ) : (
            <a key={i} href={href} target="_blank" rel="noreferrer" className={cls}>
              {label}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function Command({ lines, caption }: { lines: string[]; caption?: string }) {
  return (
    <figure>
      <div className="flex items-start gap-2 rounded-lg border border-ink-800 bg-ink-950 py-2.5 pl-3 pr-2">
        <pre className="min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere] font-mono text-xs leading-relaxed text-ink-100 md:text-sm">
          <code className="language-bash" translate="no">
            {lines.map((l, i) => (
              <span key={i} className="block">
                <span className="select-none text-ink-500" aria-hidden="true">
                  ${" "}
                </span>
                {l}
              </span>
            ))}
          </code>
        </pre>
        <CopyButton value={lines.join("\n")} label="Copy command" className="shrink-0" />
      </div>
      {caption && (
        <figcaption className="mt-1.5 text-xs text-muted-foreground">
          <Inline text={caption} />
        </figcaption>
      )}
    </figure>
  );
}

export function GuideBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="leading-relaxed text-muted-foreground">
          <Inline text={block.text} />
        </p>
      );
    case "cmd":
      return <Command lines={block.lines} caption={block.caption} />;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`space-y-2 pl-5 leading-relaxed text-muted-foreground ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((it, i) => (
            <li key={i} className="pl-1">
              <Inline text={it} />
            </li>
          ))}
        </Tag>
      );
    }
    case "note": {
      const warn = block.tone === "warn";
      const Icon = warn ? AlertTriangle : Lightbulb;
      return (
        <p
          className={`flex gap-3 rounded-lg border p-3 text-sm leading-relaxed ${
            warn ? "border-amber-500/40 bg-amber-500/10" : "border-primary/30 bg-primary/5"
          }`}
        >
          <Icon className={`mt-0.5 size-4 shrink-0 ${warn ? "text-amber-500" : "text-primary"}`} aria-hidden="true" />
          <span>
            <strong className="font-semibold">{warn ? "Important: " : "Tip: "}</strong>
            <Inline text={block.text} />
          </span>
        </p>
      );
    }
    case "os":
      return (
        <OsTabs
          panels={{
            mac: <GuideBlocks blocks={block.mac} />,
            linux: <GuideBlocks blocks={block.linux} />,
            windows: <GuideBlocks blocks={block.windows} />,
          }}
        />
      );
    case "faq":
      return (
        <div className="divide-y divide-border rounded-xl border border-border">
          {block.items.map((f) => (
            <details key={f.q} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-3 space-y-3">
                <GuideBlocks blocks={f.a} />
              </div>
            </details>
          ))}
        </div>
      );
  }
}

export function GuideBlocks({ blocks = [] }: { blocks?: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <GuideBlock key={i} block={b} />
      ))}
    </>
  );
}
